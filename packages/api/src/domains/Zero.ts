import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export class ZeroGroup extends HttpApiGroup.make("zero")
	.add(HttpApiEndpoint.post("push", "/push").addSuccess(Schema.Object))
	.prefix("/zero") {}
