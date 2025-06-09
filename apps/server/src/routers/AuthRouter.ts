import {
	HttpApiBuilder,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import { BunHttpServerRequest } from "@effect/platform-bun";
import { Api } from "@sphericon/api";
import { Auth, BetterAuthApiError } from "@sphericon/auth";
import { Effect } from "effect";

const betterAuthHandler = Effect.gen(function* () {
	const request = yield* HttpServerRequest.HttpServerRequest;
	const req = BunHttpServerRequest.toRequest(request);

	const { auth } = yield* Auth;
	const res = yield* Effect.tryPromise({
		try: () => auth.handler(req),
		catch: (cause) => {
			return new BetterAuthApiError({ cause });
		},
	}).pipe(Effect.tapError(Effect.logError));

	return HttpServerResponse.raw(res);
});

export const AuthRouter = HttpApiBuilder.group(
	Api,
	"auth",
	Effect.fnUntraced(function* (handlers) {
		return handlers
			.handleRaw("get", () => betterAuthHandler)
			.handleRaw("post", () => betterAuthHandler);
	}),
);
