import { LoaderFunction } from '@remix-run/node';
import { discordAuthenticator } from '~/services/auth.server';

export let loader: LoaderFunction = ({ request }) => {
	return discordAuthenticator.authenticate('discord', request, {
		successRedirect: '/auth/onboarding',
		failureRedirect: '/login',
	});
};
