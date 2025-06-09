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
			},
		};
	},
	async run() {
		await import("./infra/vpc");
		await import("./infra/cluster");
		await import("./infra/db");
		return {};
	},
});
