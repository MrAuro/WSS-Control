import { LoaderFunction, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { discordAuthenticator } from '~/services/auth.server';
import { Computer } from '~/services/models/Computer';
import { User } from '~/services/models/User';

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
	const [socket, setSocket] = useState<WebSocket | null>(null);
	const [messages, setMessages] = useState<string[]>([]);
	const [input, setInput] = useState('');
	const [connected, setConnected] = useState(false);

	useEffect(() => {
		const newSocket = new WebSocket('ws://localhost:3001');
		setSocket(newSocket);

		newSocket.onopen = () => {
			console.log('WebSocket open');
			setConnected(true);
		};

		newSocket.onmessage = (event) => {
			console.log('WebSocket message', event.data);
			setMessages((messages) => [...messages, event.data]);
		};

		newSocket.onclose = () => {
			console.log('WebSocket close');
			setConnected(false);
		};

		return () => {
			newSocket.close();
		};
	}, []);

	const sendMessage = () => {
		if (socket) {
			messages.push(input);
			socket.send(input);
			setInput('');
		}
	};

	return (
		<>
			<div>{connected ? 'Connected' : 'Disconnected'}</div>
			<div>
				<input value={input} onChange={(event) => setInput(event.target.value)} />
				<button onClick={sendMessage}>Send</button>
				<div>
					{messages.map((message, index) => (
						<p key={index}>{message}</p>
					))}
				</div>
			</div>
		</>
	);
}
