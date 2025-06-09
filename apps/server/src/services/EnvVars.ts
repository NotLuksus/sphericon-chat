import { Config, Effect } from "effect";

export class EnvVars extends Effect.Service<EnvVars>()("EnvVars", {
	accessors: true,
	effect: Effect.gen(function* () {
		return {
			// Server
			PORT: yield* Config.integer("PORT").pipe(Config.withDefault(3000)),
			ENV: yield* Config.literal(
				"dev",
				"prod",
			)("ENV").pipe(Config.withDefault("dev")),
			APP_URL: yield* Config.url("APP_URL").pipe(
				Config.map((url) => url.toString().replace(/\/$/, "")),
				Config.withDefault("http://localhost:3000"),
			),

			// Database
			DATABASE_URL: yield* Config.redacted("DATABASE_URL"),
			OTLP_URL: yield* Config.url("OTLP_URL").pipe(
				Config.withDefault("http://jaeger:4318/v1/traces"),
			),
		} as const;
	}),
}) {}
