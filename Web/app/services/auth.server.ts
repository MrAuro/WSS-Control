import { sessionStorage } from '~/services/session.server';
import { Authenticator } from 'remix-auth';
// import { UserInterface } from './Models/user.schema';
import { DiscordProfile, DiscordStrategy } from './discord.strategy';

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session

export let discordAuthenticator = new Authenticator<any>(sessionStorage, {
	sessionKey: 'sessionKeyDiscord',
	sessionErrorKey: 'sessionErrorKeyDiscord',
});

discordAuthenticator.use(
	new DiscordStrategy(
		{
			callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
			clientID: process.env.DISCORD_CLIENT_ID || '',
			clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
			scope: ['identify', 'guilds.join'],
		},
		async ({ profile }) => {
			return profile;
		}
	),
	'discord'
);

export type Session = {
	user: DiscordProfile;
};
