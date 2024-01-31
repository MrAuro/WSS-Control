import { Accordion, Badge, Card, Collapse, Container, Group, Paper, Table, Title, Text, Textarea, Radio, Button, Center, Loader } from '@mantine/core';
import { showNotification, updateNotification } from '@mantine/notifications';
import { LoaderFunction, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { discordAuthenticator } from '~/services/auth.server';
import { Computer } from '~/services/models/Computer';
import { User } from '~/services/models/User';
import { Entity, InstructionType, Message, OpCode, UpdateType } from '~/services/ws';
import { CheckIcon } from '@mantine/core';
import { Check } from 'tabler-icons-react';

export const loader: LoaderFunction = async ({ params, request }) => {
	const session = await discordAuthenticator.isAuthenticated(request, {
		failureRedirect: '/login',
	});

	if (session) {
		const user = await User.findOne({ id: session.id });

		if (!user) {
			return redirect('/auth/onboarding');
		} else {
			if (!user.permitted) {
				return redirect('/');
			} else {
				const computers = await Computer.find({});

				return {
					user,
					session,
					computers,
				};
			}
		}
	} else {
		return {
			redirect: '/login',
		};
	}
};

export default function Index() {
	const { session, user, computers } = useLoaderData();
	const [type, setType] = useState('text');
	const [text, setText] = useState('');
	const [_computers, setComputers] = useState(computers);

	const [socket, setSocket] = useState<WebSocket | null>(null);
	const [messages, setMessages] = useState<string[]>([]);
	const [input, setInput] = useState('');
	const [connected, setConnected] = useState(false);

	useEffect(() => {
		const newSocket = new WebSocket('wss://example.com');
		setSocket(newSocket);
		const socketName = `Web-${user.id}`;

		newSocket.onopen = () => {
			console.log('WebSocket open');
			setConnected(true);

			if (newSocket?.readyState === newSocket?.OPEN) {
				// wait 1 second for the socket to be ready

				setTimeout(() => {
					const message: Message = {
						op: OpCode.HELLO,
						data: {
							name: socketName,
							os: 'WEB',
						},
						to: 'WSS',
						from: socketName,
					};

					newSocket?.send(JSON.stringify(message));
				}, 1000);
			}
		};

		newSocket.onmessage = (event) => {
			console.log('WebSocket message', event.data);
			setMessages((messages) => [...messages, event.data]);

			const message: Message = JSON.parse(event.data);

			if (message.op === OpCode.PING) {
				console.log("PING'ed");
				const message: Message = {
					op: OpCode.PONG,
					data: null,
					to: 'WSS',
					from: socketName,
				};

				newSocket?.send(JSON.stringify(message));
				console.log("PONG'ed");
			} else if (message.op === OpCode.DONE) {
				console.log('DONE', message);

				updateNotification({
					id: message.data,
					color: 'green',
					title: 'Instruction executed',
					message: 'The instruction has been executed successfully',
					icon: <Check size={16} />,
					autoClose: 3000,
				});
			} else if (message.op === OpCode.UPDATE) {
				if (message.data.type === UpdateType.COMPUTER_STATUS) {
					// get the computer by message.data.data.name and update the values
					// if the computer is not found, add it to the list

					let found = false;
					let computersClone = _computers;

					console.log('new', message.data.data);

					computersClone.map((computer: any) => {
						if (computer.name === message.data.data.name) {
							found = true;
							computer.online = message.data.data.online;
							computer.lastSeen = message.data.data.lastSeen;
						}
					});

					if (!found) {
						computersClone.push({
							...message.data.data,
							_id: crypto.randomUUID(),
						});
					}

					setComputers(computersClone);
				}
			}
		};

		newSocket.onclose = () => {
			console.log('WebSocket close');
			setConnected(false);
			alert('Connection closed, please refresh the page');
		};

		return () => {
			newSocket.close();
		};
	}, []);

	const sendMessage = (to: Entity, uuid: string) => {
		if (socket) {
			const _msg = {
				op: OpCode.INSTRUCTION,
				data: {
					type: type === 'text' ? InstructionType.TEXT : InstructionType.SHELL,
					value: text,
					to: to,
					id: uuid,
				},
				to: 'WSS',
				from: `Web-${user.id}`,
			} as Message;
			console.log(_msg);
			socket.send(JSON.stringify(_msg));
		}
	};

	return (
		<>
			{socket?.readyState === socket?.OPEN && connected ? (
				<Accordion variant="separated">
					{_computers
						.sort((a: any, b: any) => Number(b.online) - Number(a.online))
						.map((computer: any) => {
							console.log(computer);
							if (computer.online) {
								return (
									<Accordion.Item value={computer._id} key={computer._id}>
										<Accordion.Control>
											<Badge color="green" radius="lg">
												Online
											</Badge>{' '}
											{computer.name} - {computer?.ip ?? '<ip unknown>'}
										</Accordion.Control>
										<Accordion.Panel>
											<>
												<Radio.Group value={type} onChange={setType} label="Input method">
													<Radio label="Text" value="text" />
													<Radio label="Shell" value="shell" />
												</Radio.Group>
												<Textarea
													placeholder="Text input"
													label="Text input"
													value={text}
													onChange={(event) => setText(event.currentTarget.value)}
												/>
												<Button
													my="sm"
													onClick={(event) => {
														const uuid = crypto.randomUUID();
														sendMessage(computer.name, uuid);
														showNotification({
															id: uuid,
															loading: true,
															title: 'Executing instruction',
															message: `${type === 'text' ? 'Text' : 'Shell'} instruction to ${computer.name}`,
															autoClose: false,
															disallowClose: true,
														});
													}}
												>
													Send
												</Button>
											</>
										</Accordion.Panel>
									</Accordion.Item>
								);
							} else {
								return (
									<Accordion.Item value={computer._id} key={computer._id}>
										<Accordion.Control>
											<Badge color="red" radius="lg">
												Offline
											</Badge>{' '}
											{computer.name} - {computer?.ip ?? '<ip unknown>'}
										</Accordion.Control>
										<Accordion.Panel>
											<Text>Computer is currently offline, last seen {humanizeTime(Date.now() - new Date(computer.lastSeen).getTime())} ago</Text>
										</Accordion.Panel>
									</Accordion.Item>
								);
							}
						})}
				</Accordion>
			) : (
				<Center>
					<Loader />
				</Center>
			)}
		</>
	);
}

function humanizeTime(ms: number, depth: 'seconds' | 'minutes' | 'hours' | 'days' | 'auto' = 'auto'): string {
	let days, hours, minutes, seconds, milliseconds;

	milliseconds = ms;
	seconds = Math.floor(milliseconds / 1000);
	milliseconds = milliseconds % 1000;
	minutes = Math.floor(seconds / 60);
	seconds = seconds % 60;
	hours = Math.floor(minutes / 60);
	minutes = minutes % 60;
	days = Math.floor(hours / 24);
	hours = hours % 24;

	let _ms = days == 0 && hours == 0 && minutes == 0 ? (seconds ? `.${milliseconds}` : '') : '';

	return ((days > 0 ? `${days}d ` : '') + (hours > 0 ? `${hours}h ` : '') + (minutes > 0 ? `${minutes}m ` : '') + (seconds > 0 ? `${seconds}${_ms}s ` : '')).trim();
}
