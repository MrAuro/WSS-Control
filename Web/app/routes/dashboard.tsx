import {
	AppShell,
	Avatar,
	Burger,
	Center,
	createStyles,
	Group,
	Header,
	Loader,
	MediaQuery,
	Menu,
	Navbar,
	Space,
	Text,
	Title,
	UnstyledButton,
	useMantineTheme,
} from '@mantine/core';
import { ActionArgs, LoaderFunction, redirect } from '@remix-run/node';
import { Form, Link, Outlet, useLoaderData, useLocation, useTransition } from '@remix-run/react';
import { useState } from 'react';
import { LayoutGrid, Logout, MessageCircle2, Settings, Settings2, Shield, SquaresFilled, Star } from 'tabler-icons-react';
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
				return redirect('/');
			} else {
				return {
					user,
					session,
				};
			}
		}
	} else {
		return {
			redirect: '/login',
		};
	}
};

const useStyles = createStyles((theme, _params, getRef) => {
	const icon = getRef('icon');
	return {
		header: {
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
			height: '100%',
		},

		footer: {
			paddingTop: theme.spacing.md,
			marginTop: theme.spacing.md,
			borderTop: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]}`,
		},

		link: {
			...theme.fn.focusStyles(),
			display: 'flex',
			alignItems: 'center',
			textDecoration: 'none',
			fontSize: theme.fontSizes.sm,
			color: theme.colorScheme === 'dark' ? theme.colors.dark[1] : theme.colors.gray[7],
			padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
			borderRadius: theme.radius.sm,
			fontWeight: 500,

			'&:hover': {
				backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
				color: theme.colorScheme === 'dark' ? theme.white : theme.black,

				[`& .${icon}`]: {
					color: theme.colorScheme === 'dark' ? theme.white : theme.black,
				},
			},
		},

		linkIcon: {
			ref: icon,
			color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
			marginRight: theme.spacing.sm,
		},

		linkActive: {
			'&, &:hover': {
				backgroundColor: theme.colorScheme === 'dark' ? theme.fn.rgba(theme.colors[theme.primaryColor][8], 0.25) : theme.colors[theme.primaryColor][0],
				color: theme.colorScheme === 'dark' ? theme.white : theme.colors[theme.primaryColor][7],
				[`& .${icon}`]: {
					color: theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 5 : 7],
				},
			},
		},
	};
});

const _data = [
	{
		link: '/dashboard',
		label: 'Dashboard',
		icon: SquaresFilled,
	},
	{
		link: '/dashboard/computers',
		label: 'Computers',
		icon: LayoutGrid,
	},
	{
		link: '/dashboard/debug',
		label: 'Debug',
		icon: Settings2,
	},
];

export default function Index() {
	const data = useLoaderData();
	const { classes, cx } = useStyles();
	const theme = useMantineTheme();
	const location = useLocation();
	const [active, setActive] = useState(_data[_data.findIndex(({ link }) => link === location.pathname)].label);

	const [opened, setOpened] = useState(false);

	const transition = useTransition();

	console.log(data);

	const links: React.ReactNode[] = [];

	_data.forEach((item) => {
		links.push(
			<Link
				className={cx(classes.link, {
					[classes.linkActive]: item.label === active,
				})}
				to={item.link}
				key={item.label}
				onClick={(event) => {
					setActive(item.label);
				}}
			>
				<item.icon className={cx(classes.linkIcon)} />
				<span>{item.label}</span>
			</Link>
		);
	});

	return (
		<>
			<AppShell
				navbarOffsetBreakpoint="sm"
				asideOffsetBreakpoint="sm"
				fixed
				padding="md"
				navbar={
					<Navbar p="md" hiddenBreakpoint="sm" hidden={!opened} width={{ sm: 250 }}>
						{links}
					</Navbar>
				}
				header={
					<Header className={classes.header} height={60} p="md">
						<MediaQuery largerThan="sm" styles={{ display: 'none' }}>
							<Burger opened={opened} onClick={() => setOpened((o) => !o)} size="sm" color={theme.colors.gray[6]} mr="xl" />
						</MediaQuery>
						<Title>CCE Dashboard</Title>
						<Group>
							<>
								{data ? (
									<Menu position="bottom-end">
										<Menu.Target>
											<UnstyledButton>
												<Avatar
													src={`https://cdn.discordapp.com/avatars/${data.session.__json.id}/${data.session.__json.avatar}.png`}
													radius="xl"
												/>
											</UnstyledButton>
										</Menu.Target>

										<Menu.Dropdown>
											<Form method="post">
												<Menu.Item icon={<Logout size={18} />} component={Link} to="/logout">
													Logout
												</Menu.Item>
											</Form>
										</Menu.Dropdown>
									</Menu>
								) : (
									<></>
								)}
							</>
						</Group>
					</Header>
				}
				styles={(theme) => ({
					main: {
						backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
					},
				})}
			>
				<Title order={1}>{active}</Title>
				<Space h="xs" />
				{transition.state === 'idle' ? (
					<Outlet />
				) : (
					<Center>
						{' '}
						<Loader />{' '}
					</Center>
				)}
			</AppShell>
		</>
	);
}
