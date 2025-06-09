import { Database } from "@sphericon/db";
import {
	accountsTable,
	jwksTable,
	sessionsTable,
	usersTable,
	verificationsTable,
} from "@sphericon/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt, openAPI } from "better-auth/plugins";
import { Context, Effect, Layer } from "effect";

export type Config = {
	appUrl: string;
};

const makeService = Effect.fn("makeAuthService")(function* (config: Config) {
	const { db } = yield* Database.Database;

	const auth = betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: {
				user: usersTable,
				account: accountsTable,
				session: sessionsTable,
				verification: verificationsTable,
				jwks: jwksTable,
			},
		}),
		emailAndPassword: {
			enabled: true,
		},
		trustedOrigins: [config.appUrl],
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
			},
		},
		plugins: [openAPI(), jwt()],
	});

	return { auth };
});

type Shape = Effect.Effect.Success<ReturnType<typeof makeService>>;

export class Auth extends Context.Tag("Auth")<Auth, Shape>() {}

export const layer = (config: Config) =>
	Layer.effect(Auth, makeService(config));
