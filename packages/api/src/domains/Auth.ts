import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import * as Auth from "@sphericon/auth";
import { Schema } from "effect";

export class AuthGroup extends HttpApiGroup.make("auth")
	.add(
		HttpApiEndpoint.get("get", "/*")
			.addSuccess(Schema.Any)
			.addError(Auth.BetterAuthApiError),
	)
	.add(
		HttpApiEndpoint.post("post", "/*")
			.addSuccess(Schema.Any)
			.addError(Auth.BetterAuthApiError),
	)
	.prefix("/auth") {}
