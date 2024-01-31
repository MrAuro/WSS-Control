import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import { connect } from 'mongoose';
import { createLogger, format, transports } from 'winston';
import { WebSocketServer } from 'ws';
import { Connection } from './Connection';
import { Computer } from './models/Computer';
import { Id, ConnectionState, OpCode, Message, UpdateType } from './Types';
dotenv.config();

// Create logger
export const logger = createLogger({
	transports: [new transports.Console()],
	format: format.combine(
		format.colorize(),
		format.timestamp(),
		format.printf(({ timestamp, level, message }) => {
			return `[${timestamp}] ${level}: ${message}`;
		})
	),
});

// Set the level to debug
logger.level = 'debug';

// Get port from .env
const port: number = parseInt(process.env.PORT || '3001');

// Create WebSocket server
const wss = new WebSocketServer({ port });

// Connect to MongoDB
connect(process.env.MONGO_URI || '')
	.then(() => {
		logger.info('Connected to MongoDB');
	})
	.catch((err) => {
		logger.error(err);
	});

// Map of all connections
export const connections = new Map<Id, Connection>();

// Handle connections
wss.on('connection', async (ws, req) => {
	let id = generateId();
	connections.set(id, new Connection(id, ws, req.headers['x-forwarded-for'] as string));

	logger.info(`Client connected (assigned temp id: ${id})`);

	setTimeout(() => {
		logger.debug(`Checking if client registered (id: ${id})`);
		let connection = connections.get(id) as Connection;
		if (connection?.state === ConnectionState.REGISTERED) {
			logger.debug(`Client registered before timeout (id: ${id})`);
		} else {
			if (connection) {
				logger.info(`Client hello timed out (id: ${id})`);
				connections.delete(id);
				connection.send({
					op: OpCode.ERROR,
					data: {
						message: 'hello timed out',
					},
					to: connection.name,
					from: 'WSS',
				});
				connection.socket.close();
				logger.debug(`Client closed (id: ${id})`);
			} else {
				logger.debug(`Client already closed (id: ${id})`);
			}
		}
	}, 10000);

	ws.on('message', async (message) => {
		let _msg: Message | null = null;
		try {
			_msg = JSON.parse(message.toString());
		} catch (err) {
			logger.warn(`Client sent invalid JSON (id: ${id})`);
			ws.close(1007, 'invalid JSON');
		}

		const msg = _msg as Message;

		if (!msg) {
			logger.warn(`Client sent invalid JSON (id: ${id})`);
			ws.close(1007, 'invalid JSON');
			return;
		}

		logger.info(`${JSON.stringify(msg)}`);

		let connection = connections.get(id) as Connection;

		switch (msg?.op) {
			case OpCode.HELLO:
				{
					if (connection.state === ConnectionState.CONNECTED) {
						const lastSeen = new Date();

						if (msg.data?.os !== 'WEB') {
							logger.debug(`Client registering (id: ${id})`);
							await Computer.updateOne(
								{ name: msg.data.name },
								{
									name: msg.data.name,
									os: msg.data.os,
									online: true,
									ip: connection.ip,
									lastSeen,
								},
								{ upsert: true }
							).exec();
							logger.debug(`Client added to database (id: ${id})`);
						} else {
							logger.debug(`Client is a web client, skipped db (id: ${id})`);
						}

						logger.debug(`Renaming client (id: ${id} -> ${msg.data.name})`);
						let _connection = connections.get(id) as Connection;
						id = msg.data.name;
						connections.delete(id);
						_connection.name = id;
						_connection.state = ConnectionState.REGISTERED;
						_connection.os = msg.data.os;
						connection.startPing();

						connections.set(id, _connection as Connection);

						logger.debug(`Sending registration confirmation (id: ${id})`);
						connection.send({
							op: OpCode.REGISTER,
							data: null,
							to: msg.from,
							from: 'WSS',
						});

						if (msg.data?.os !== 'WEB') {
							broadcastToWeb({
								op: OpCode.UPDATE,
								data: {
									type: UpdateType.COMPUTER_STATUS,
									data: {
										name: msg.data.name,
										online: true,
										os: msg.data.os,
										lastSeen,
									},
								},
								to: '',
								from: 'WSS',
							});
						}
					} else {
						logger.debug(`Client already registered (id: ${id})`);
						connection.send({
							op: OpCode.ERROR,
							data: {
								message: 'already registered',
							},
							to: msg.from,
							from: 'WSS',
						});
					}
				}
				break;
			// DEPRECATED - DO NOT USE
			// case OpCode.READY:
			// 	{
			// 		if (connection.state === ConnectionState.REGISTERED) {
			// 			logger.info(`Client ready (id: ${id})`);
			// 			connection.state = ConnectionState.READY;
			// 			connection.lastPong = Date.now();

			// 			connections.set(id, connection);

			// 			connection.startPing();
			// 		}
			// 	}
			// 	break;
			case OpCode.PING:
				{
					// The server should only send PINGs
					connection.send({
						op: OpCode.ERROR,
						data: {
							message: 'operation not allowed',
						},
						to: connection.name,
						from: 'WSS',
					});
				}
				break;
			case OpCode.PONG:
				{
					if (connection?.state === ConnectionState.REGISTERED) {
						connection.ponged = true;
						connections.set(id, connection);
						logger.debug(`Client pong (id: ${id})`);
					}
				}
				break;
			case OpCode.INSTRUCTION:
				{
					if (connection?.os === 'WEB') {
						logger.info(`Web client sent instruction (id: ${id})`);
						const targetConnection = connections.get(msg.data.to);

						if (!targetConnection) {
							connection.send({
								op: OpCode.ERROR,
								data: {
									message: "target doesn't exist or is offline",
								},
								to: msg.from,
								from: 'WSS',
							});
						} else {
							targetConnection.send({
								op: OpCode.EXECUTE,
								data: {
									type: msg.data.type,
									value: msg.data.value,
									id: msg.data.id,
								},
								to: msg.data.to,
								from: 'WSS',
							});
						}
					} else {
						logger.info(`Non-web client tried to send instruction (id: ${id})`);
					}
				}
				break;
			case OpCode.DONE:
				{
					if (connection?.os !== 'WEB') {
						logger.info(`Client sent done (id: ${id})`);

						broadcastToWeb({
							op: OpCode.DONE,
							data: msg.data,
							to: '',
							from: 'WSS',
						});
					}
				}
				break;
		}
	});

	ws.on('close', () => {
		// const id = Array.from(connections.keys()).find((key) => connections.get(key) === ws);
		if (id) {
			Computer.updateOne(
				{
					name: id,
				},
				{
					online: false,
					lastSeen: new Date(),
				}
			).exec();

			connections.delete(id);

			broadcastToWeb({
				op: OpCode.UPDATE,
				data: {
					type: UpdateType.COMPUTER_STATUS,
					data: {
						name: id,
						online: false,
						lastSeen: new Date(),
					},
				},
				to: '',
				from: 'WSS',
			});

			logger.info(`Client disconnected (id: ${id})`);
		} else {
			logger.info('Client disconnected (id not found)');
		}
	});
});

wss.on('listening', () => {
	logger.info(`Server started on port ${port}`);
});

wss.on('error', (error) => {
	logger.error(error);
});

wss.on('close', () => {
	logger.info('Server closed');
});

function generateId(): Id {
	// Prevent collisions
	let id = randomBytes(8).toString('hex');
	while (connections.has(id)) {
		id = randomBytes(8).toString('hex');
	}
	return id;
}

function broadcastToWeb(msg: Message) {
	const webConnections = Array.from(connections.values()).filter((connection) => connection?.os === 'WEB');

	webConnections.forEach((webConnection) => {
		webConnection.send({
			...msg,
			to: webConnection.name,
		});
	});
}
