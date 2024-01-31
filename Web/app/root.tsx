import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import { MantineProvider, createEmotionCache } from '@mantine/core';
import { StylesPlaceholder } from '@mantine/remix';
import dbConnect from './services/mongo.server';
import { NotificationsProvider } from '@mantine/notifications';

export const meta: MetaFunction = () => ({
	charset: 'utf-8',
	title: 'CCE Dashboard',
	viewport: 'width=device-width,initial-scale=1',
});

createEmotionCache({ key: 'mantine' });

export const loader: LoaderFunction = async () => {
	await dbConnect();

	return true;
};

export default function App() {
	return (
		<MantineProvider
			theme={{
				colorScheme: 'dark',
			}}
			withGlobalStyles
			withNormalizeCSS
		>
			<NotificationsProvider>
				<html lang="en">
					<head>
						<StylesPlaceholder />
						<Meta />
						<Links />
					</head>
					<body>
						<Outlet />
						<ScrollRestoration />
						<Scripts />
						<LiveReload />
					</body>
				</html>
			</NotificationsProvider>
		</MantineProvider>
	);
}
