/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
	app(input) {
		return {
			name: "sphericon-chat",
			removal: input?.stage === "production" ? "retain" : "remove",
			protect: ["production"].includes(input?.stage),
			home: "aws",
			providers: {
				aws: {
					profile: "sandbox",
				},
				random: "4.18.2",
				command: "1.1.0",
			},
		};
	},
	async run() {
		await import("./infra/secrets");
		await import("./infra/vpc");
		await import("./infra/cluster");
		await import("./infra/db");
		await import("./infra/server");
		await import("./infra/web");
		await import("./infra/zero");
		return {};
	},
});
