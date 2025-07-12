import { HttpApi } from "@effect/platform";
import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { NotFound, Unauthorized } from "@effect/platform/HttpApiError";
import { Schema } from "effect";
import { HealthGroup } from "./domains/Health";
import { ZeroGroup } from "./domains/Zero";
import { ChatId } from "./schemas";

// Client-safe SSE group without server middleware
const ClientSseGroup = HttpApiGroup.make("sse")
	.add(
		HttpApiEndpoint.get("connect", "/connect/:chatId")
			.setPath(Schema.Struct({ chatId: ChatId }))
			.addSuccess(Schema.Unknown)
			.addError(NotFound)
			.addError(Unauthorized),
	)
	.prefix("/sse");

// Client-safe API that excludes server-side dependencies
export const ClientApi = HttpApi.make("ClientApi")
	.add(HealthGroup)
	.add(ZeroGroup)
	.add(ClientSseGroup)
	.prefix("/api");