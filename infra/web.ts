import { server } from "./server";
import { zero } from "./zero";

export const web = new sst.aws.StaticSite("Web", {
	path: "./apps/web",
	environment: {
		VITE_STAGE: $app.stage,
		VITE_SERVER_URL: server.url,
		VITE_ZERO_URL: zero.url,
	},
});
