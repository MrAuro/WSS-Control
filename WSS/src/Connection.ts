import { WebSocket } from 'ws';
import { connections, logger } from './Server';
import { Entity, ConnectionState, Message, OpCode } from './Types';

export class Connection {
	public name: Entity;
	public socket: WebSocket;
	public state: ConnectionState;
	public ponged: boolean = false;
	public os: string = '';
	public ip: string = '';
	private pingInterval: NodeJS.Timeout | null = null;

	constructor(name: Entity, socket: WebSocket, ip: string) {
		this.name = name;
		this.socket = socket;
		this.state = ConnectionState.CONNECTED;
		this.ip = ip;
	}

	public send(message: Message): void {
		if (this.socket.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(message));
		}
	}

	public startPing(): void {
		if (this.state === ConnectionState.REGISTERED) {
			this.pingInterval = setInterval(() => {
				this.send({
					op: OpCode.PING,
					data: null,
					to: this.name,
					from: 'WSS',
				});
				logger.debug(`Sending ping (id: ${this.name})`);
				connections.set(this.name, this);

				setTimeout(() => {
					if (this.state === ConnectionState.REGISTERED) {
						if (!this.ponged) {
							this.send({
								op: OpCode.ERROR,
								data: {
									message: 'ping timed out',
								},
								to: this.name,
								from: 'WSS',
							});
							this.socket.close();
							clearInterval(this.pingInterval as NodeJS.Timeout);
							logger.info(`Client ping timed out (id: ${this.name})`);

							connections.delete(this.name);
						} else {
							this.ponged = false;
							logger.debug(`Client ponged before time out (id: ${this.name})`);
						}
					}
				}, 10 * 1000); // 10 seconds
			}, 0.5 * 60 * 1000); // 5 minutes
		}
	}
}
