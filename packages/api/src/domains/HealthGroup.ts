import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

export class HealthGroup extends HttpApiGroup.make("health")
	.add(HttpApiEndpoint.get("get", "/").addSuccess(Schema.String))
	.prefix("/health") {}
