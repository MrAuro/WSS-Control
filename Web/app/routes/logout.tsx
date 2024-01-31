import { LoaderFunction } from '@remix-run/node';
import { discordAuthenticator } from '~/services/auth.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	await discordAuthenticator.logout(request, { redirectTo: '/login' });
};
