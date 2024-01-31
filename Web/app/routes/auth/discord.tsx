import { LoaderFunction } from '@remix-run/node';
import { discordAuthenticator } from '~/services/auth.server';

export let loader: LoaderFunction = async ({ request }) => {
	await discordAuthenticator.authenticate('discord', request, {});
};
