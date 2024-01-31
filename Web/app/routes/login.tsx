import { LoaderFunction } from '@remix-run/node';
import { discordAuthenticator } from '~/services/auth.server';

export const loader: LoaderFunction = async ({ request }) => {
	const session =
		(await discordAuthenticator.isAuthenticated(request, {
			successRedirect: '/',
		})) || null;

	if (session) {
		return {
			redirect: '/',
		};
	} else {
		return {
			redirect: '/login',
		};
	}
};

export default function Login() {
	return (
		<div>
			<h1>Login</h1>
			<a href="/auth/discord">Login with Discord</a>
		</div>
	);
}
