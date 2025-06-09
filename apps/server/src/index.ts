import { AuthRouter } from "@/routers/AuthRouter";
import { HealthRouter } from "@/routers/HealthRouter";
import { EnvVars } from "@/services/EnvVars";
import { NodeSdk } from "@effect/opentelemetry";
import {
	HttpApiBuilder,
	HttpApiScalar,
	HttpMiddleware,
	HttpServer,
} from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Api } from "@sphericon/api";
import { layer as AuthLayer, CurrentUserMiddlewareLive } from "@sphericon/auth";
import { Database } from "@sphericon/db";
import dotenv from "dotenv";
import { Duration, Effect, Layer, LogLevel, Logger, Schedule } from "effect";

dotenv.config();

const ApiLive = HttpApiBuilder.api(Api).pipe(
	Layer.provide(HealthRouter),
	Layer.provide(AuthRouter),
);

const DatabaseLive = Layer.unwrapEffect(
	EnvVars.pipe(
		Effect.map((envVars) =>
			Database.layer({
				url: envVars.DATABASE_URL,
				ssl: envVars.ENV === "prod",
			}),
		),
	),
);

const AuthLive = Layer.unwrapEffect(
	EnvVars.pipe(
		Effect.map((envVars) =>
			AuthLayer({
				appUrl: envVars.APP_URL,
			}),
		),
	),
);

const NodeSdkLive = Layer.unwrapEffect(
	EnvVars.OTLP_URL.pipe(
		Effect.map((url) =>
			NodeSdk.layer(() => ({
				resource: {
					serviceName: "sphericon-chat",
				},
				spanProcessor: new BatchSpanProcessor(
					new OTLPTraceExporter({
						url: url.toString(),
					}),
				),
			})),
		),
	),
);

const CorsLive = Layer.unwrapEffect(
	EnvVars.pipe(
		Effect.map((envVars) =>
			HttpApiBuilder.middlewareCors({
				allowedOrigins: [envVars.APP_URL],
				allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
				allowedHeaders: ["Content-Type", "Authorization", "B3", "traceparent"],
				credentials: true,
			}),
		),
	),
);

const HttpServerLive = Layer.unwrapEffect(
	EnvVars.pipe(
		Effect.map((envVars) => BunHttpServer.layer({ port: envVars.PORT })),
	),
);

const ServerLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
	HttpServer.withLogAddress,
	Layer.provide(CorsLive),
	Layer.provide(
		HttpApiScalar.layer({
			scalar: {
				layout: "modern",
				theme: "deepSpace",
			},
		}),
	),
	Layer.provide(ApiLive),
	Layer.provide(CurrentUserMiddlewareLive),
	Layer.provide(AuthLive),
	Layer.provide(DatabaseLive),
	Layer.provide(HttpServerLive),
	Layer.provide(NodeSdkLive),
	Layer.provide(EnvVars.Default),
);

Layer.launch(ServerLive).pipe(
	Logger.withMinimumLogLevel(LogLevel.Debug),
	Effect.tapErrorCause(Effect.logError),
	Effect.retry({
		while: (error) => error._tag === "DatabaseConnectionLostError",
		schedule: Schedule.exponential("1 second", 2).pipe(
			Schedule.modifyDelay(Duration.min("8 seconds")),
			Schedule.jittered,
			Schedule.repetitions,
			Schedule.modifyDelayEffect((count, delay) =>
				Effect.as(
					Effect.logError(
						`[Server crashed]: Retrying in ${Duration.format(delay)} (attempt #${count + 1})`,
					),
					delay,
				),
			),
		),
	}),
	BunRuntime.runMain,
);
