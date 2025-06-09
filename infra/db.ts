import { isProduction } from "./stage";
import { vpc } from "./vpc";

export const db = new sst.aws.Aurora("Database", {
	vpc,
	dev: {
		database: "sphericon-chat",
		username: "user",
		password: "password",
		host: "localhost",
		port: 5432,
	},
	engine: "postgres",
	scaling: isProduction
		? undefined
		: {
				min: "0 ACU",
				max: "1 ACU",
			},
	transform: {
		clusterParameterGroup: {
			parameters: [
				{
					name: "rds.logical_replication",
					value: "1",
					applyMethod: "pending-reboot",
				},
				{
					name: "max_slot_wal_keep_size",
					value: "10240",
					applyMethod: "pending-reboot",
				},
			],
		},
	},
});

new sst.x.DevCommand("Studio", {
	link: [db],
	dev: {
		command: "bun db studio",
		directory: "packages/db",
		autostart: true,
	},
});

const migrator = new sst.aws.Function("DatabaseMigrator", {
	handler: "packages/scripts/src/migrator.handler",
	link: [db],
	vpc,
	copyFiles: [
		{
			from: "packages/db/migrations",
			to: "./migrations",
		},
	],
	environment: {
		NODE_ENV: $dev ? "development" : "production",
	},
});

if (!$dev) {
	new aws.lambda.Invocation("DatabaseMigratorInvocation", {
		input: Date.now().toString(),
		functionName: migrator.name,
	});
}
