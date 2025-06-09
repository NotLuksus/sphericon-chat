import { cluster } from "./cluster";
import { db } from "./db";
import { isProduction } from "./stage";

const BETTER_AUTH_SECRET = new random.RandomString("BetterAuthSecret", {
	length: 16,
});

export const api = new sst.aws.Service("Server", {
	cluster,
	image: {
		dockerfile: "apps/server/Dockerfile",
	},
	serviceRegistry: {
		port: 80,
	},
	loadBalancer: {
		rules: [{ listen: "80/http" }],
	},
	dev: {
		url: "http://localhost:3000",
		directory: "apps/server",
		command: "bun run dev",
		autostart: true,
	},
	environment: {
		PORT: $dev ? "3000" : "80",
		ENV: isProduction ? "prod" : "dev",
		DATABASE_URL: $interpolate`postgres://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}`,
		BETTER_AUTH_SECRET: $interpolate`${BETTER_AUTH_SECRET}`,
	},
});
