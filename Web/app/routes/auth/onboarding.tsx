import { json, LoaderFunction, redirect } from '@remix-run/node';
import { discordAuthenticator } from '~/services/auth.server';
import { User } from '~/services/models/User';

export let loader: LoaderFunction = async ({ request }) => {
	const session = await discordAuthenticator.isAuthenticated(request, {
		failureRedirect: '/login',
	});

	const newUser = new User({
		id: session.id,
		permitted: false,
	});

	try {
		await newUser.save();
		return redirect('/');
	} catch (err) {
		return redirect('/');
	}
};
