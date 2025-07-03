import { createZeroMutators } from "@/mutators/createMutators";
import { EnvVars } from "@/services/EnvVars";
import { HttpApiBuilder, HttpServerRequest } from "@effect/platform";
import { BunHttpServerRequest } from "@effect/platform-bun";
import { InternalServerError } from "@effect/platform/HttpApiError";
import type { ReadonlyJSONValue } from "@rocicorp/zero";
import { PushProcessor, ZQLDatabase } from "@rocicorp/zero/pg";
import { Api } from "@sphericon/api";
import { Database } from "@sphericon/db";
import { PgConnection } from "@sphericon/zero/connection";
import { schema } from "@sphericon/zero/schema";
import { Effect, Schema } from "effect";
import { createRemoteJWKSet, jwtVerify } from "jose";

export class BodyToJSONError extends Schema.TaggedError<BodyToJSONError>(
	"BodyToJSONError",
)("BodyToJSONError", {
	message: Schema.String,
}) {}

export class ZeroProcessorError extends Schema.TaggedError<ZeroProcessorError>(
	"ZeroProcessorError",
)("ZeroProcessorError", {
	message: Schema.String,
}) {}

export const ZeroRouter = HttpApiBuilder.group(
	Api,
	"zero",
	Effect.fnUntraced(function* (handlers) {
		const { PORT } = yield* EnvVars;
		const { pool } = yield* Database.Database;

		const processor = new PushProcessor(
			new ZQLDatabase(new PgConnection(pool), schema),
		);
		return handlers.handle("push", () =>
			Effect.gen(function* () {
				const req = yield* HttpServerRequest.HttpServerRequest;
				const raw = BunHttpServerRequest.toRequest(req);

				const jsonBody = yield* Effect.tryPromise({
					try: () => raw.json(),
					catch: (e) => new BodyToJSONError({ message: e as string }),
				}).pipe(
					Effect.catchTag("BodyToJSONError", (error) => Effect.logError(error)),
				);
				console.log(JSON.stringify(jsonBody));
				const { searchParams } = new URL(req.url, `http://localhost:${PORT}`);

				const authHeader = raw.headers.get("Authorization");
				if (!authHeader) return new InternalServerError();

				const token = authHeader.slice("Bearer ".length);

				const JWKS = createRemoteJWKSet(
					new URL("http://localhost:3000/api/auth/jwks"),
				);

				const { payload } = yield* Effect.promise(() =>
					jwtVerify(token, JWKS, {
						issuer: "http://localhost:3000",
						audience: "http://localhost:3000",
					}),
				);

				const mutators = yield* createZeroMutators({
					sub: payload.sub!,
				});

				const result = yield* Effect.promise(() =>
					processor.process(
						mutators,
						searchParams,
						jsonBody as ReadonlyJSONValue,
					),
				);

				return result;
			}),
		);
	}),
);
