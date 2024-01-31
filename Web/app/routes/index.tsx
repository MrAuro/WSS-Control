import { Center, Text, Title } from '@mantine/core';
import { LoaderFunction, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { discordAuthenticator } from '~/services/auth.server';
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
				return {
					permitted: false,
				};
			} else {
				return redirect('/dashboard');
			}
		}
	} else {
		return {
			redirect: '/login',
		};
	}
};

export default function Index() {
	const { session } = useLoaderData();

	return (
		<div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
			<Center>
				<Title>User not permitted</Title>
			</Center>
		</div>
	);
}
