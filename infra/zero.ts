import { readFileSync, writeFileSync } from "node:fs";
import { cluster } from "./cluster";
import { db } from "./db";
import { server } from "./server";

const conn = $interpolate`postgresql://${db.username}:${db.password}@${db.host}/${db.database}`;

const replicationBucket = new sst.aws.Bucket("replication-bucket");

const tag = $dev
	? "latest"
	: JSON.parse(
			readFileSync("./node_modules/@rocicorp/zero/package.json").toString(),
		).version.replace("+", "-");
const image = `registry.hub.docker.com/rocicorp/zero:${tag}`;

const zeroEnv = {
	NO_COLOR: "1",
	FORCE: "1",
	ZERO_LITESTREAM_LOG_LEVEL: "info",
	ZERO_APP_ID: $app.stage,
	ZERO_UPSTREAM_DB: conn,
	ZERO_CVR_DB: conn,
	ZERO_CHANGE_DB: conn,
	ZERO_REPLICA_FILE: "/tmp/console.db",
	ZERO_LITESTREAM_RESTORE_PARALLELISM: "64",
	ZERO_LOG_LEVEL: $dev ? "debug" : "info",
	ZERO_PUSH_URL: $interpolate`${server.url}/api/zero/push`,
	ZERO_AUTH_JWKS_URL: $interpolate`${server.url}/api/auth/jwks`,
	...($dev
		? {}
		: {
				ZERO_LITESTREAM_BACKUP_URL: $interpolate`s3://${replicationBucket.name}/zero/10`,
			}),
};

const replication = !$dev
	? new sst.aws.Service("ZeroReplication", {
			cluster,
			...($app.stage === "production"
				? {
						cpu: "2 vCPU",
						memory: "4 GB",
					}
				: {}),
			image,
			link: [db],
			health: {
				command: ["CMD-SHELL", "curl -f http://localhost:4849/ || exit 1"],
				interval: "5 seconds",
				retries: 3,
				startPeriod: "300 seconds",
			},
			loadBalancer: {
				rules: [
					{
						listen: "80/http",
						forward: "4849/http",
					},
				],
				public: false,
			},
			environment: {
				...zeroEnv,
				ZERO_CHANGE_MAX_CONNS: "3",
				ZERO_NUM_SYNC_WORKERS: "0",
			},
			logging: {
				retention: "1 month",
			},
			transform: {
				service: {
					healthCheckGracePeriodSeconds: 900000,
				},
				taskDefinition: {
					ephemeralStorage: {
						sizeInGib: 200,
					},
				},
				loadBalancer: {
					idleTimeout: 60 * 60,
				},
			},
		})
	: undefined;

if (replication)
	new command.local.Command(
		"ZeroPermission",
		{
			dir: `${process.cwd()}/packages/zero`,
			environment: {
				ZERO_UPSTREAM_DB: zeroEnv.ZERO_UPSTREAM_DB,
				ZERO_APP_ID: zeroEnv.ZERO_APP_ID,
			},
			create: "bun run zero-deploy-permissions",
			triggers: [Date.now()],
		},
		{
			dependsOn: [replication],
		},
	);

export const zero = new sst.aws.Service("Zero", {
	cluster,
	image,
	link: [db],
	...($app.stage === "production"
		? {
				cpu: "2 vCPU",
				memory: "4 GB",
			}
		: {}),
	environment: {
		...zeroEnv,
		...($dev
			? {
					ZERO_NUM_SYNC_WORKERS: "1",
				}
			: {
					ZERO_CHANGE_STREAMER_URI: replication!.url.apply((val) =>
						val.replace("http://", "ws://"),
					),
					ZERO_UPSTREAM_MAX_CONNS: "15",
					ZERO_CVR_MAX_CONNS: "160",
				}),
	},
	health: {
		command: ["CMD-SHELL", "curl -f http://localhost:4848/ || exit 1"],
		interval: "5 seconds",
		retries: 3,
		startPeriod: "300 seconds",
	},
	loadBalancer: {
		rules: [{ listen: "80/http", forward: "4848/http" }],
	},
	scaling: {
		min: 1,
		max: 4,
	},
	transform: {
		service: {
			healthCheckGracePeriodSeconds: 900000,
		},
		taskDefinition: {
			ephemeralStorage: {
				sizeInGib: 200,
			},
		},
		loadBalancer: {
			idleTimeout: 60 * 60,
		},
	},
	dev: {
		command: "bun dev",
		directory: "packages/zero",
		url: "http://localhost:4848",
	},
});
