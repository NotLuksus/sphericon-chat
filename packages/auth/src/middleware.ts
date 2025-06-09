import { HttpApiMiddleware, HttpServerRequest } from "@effect/platform";
import { Unauthorized } from "@effect/platform/HttpApiError";
import type { User } from "better-auth";
import { Context, Effect, Layer } from "effect";
import { GetSessionError } from "./errors";
import { Auth } from "./service";

export class CurrentUser extends Context.Tag("CurrentUser")<
	CurrentUser,
	User
>() {}

export class CurrentUserMiddleware extends HttpApiMiddleware.Tag<CurrentUserMiddleware>()(
	"CurrentUserMiddleware",
	{
		provides: CurrentUser,
		failure: Unauthorized,
	},
) {}

export const CurrentUserMiddlewareLive = Layer.effect(
	CurrentUserMiddleware,
	Effect.gen(function* () {
		const { auth } = yield* Auth;
		return Effect.gen(function* () {
			const req = yield* HttpServerRequest.HttpServerRequest;
			const session = yield* Effect.tryPromise({
				try: () =>
					auth.api.getSession({
						headers: new Headers(req.headers),
					}),
				catch: (e) => new GetSessionError({ message: e as string }),
			}).pipe(
				Effect.tapError(Effect.logError),
				Effect.catchTag("GetSessionError", () => new Unauthorized()),
			);

			if (!session) {
				return yield* new Unauthorized();
			}

			return session.user;
		});
	}),
);
