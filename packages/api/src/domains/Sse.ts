import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { NotFound, Unauthorized } from "@effect/platform/HttpApiError";
import { CurrentUserMiddleware } from "@sphericon/auth";
import { Schema } from "effect";
import { ChatId } from "./Chat";

export class ReplayEvent extends Schema.TaggedClass<ReplayEvent>("ReplayEvent")(
	"ReplayEvent",
	{
		message: Schema.String,
	},
) {}

export class NewChunkEvent extends Schema.TaggedClass<NewChunkEvent>(
	"NewChunkEvent",
)("NewChunkEvent", {
	content: Schema.String,
}) {}

export const SseEvents = Schema.Union(ReplayEvent, NewChunkEvent);
export type SseEvents = typeof SseEvents.Type;

export class SseGroup extends HttpApiGroup.make("sse")
	.middleware(CurrentUserMiddleware)
	.add(
		HttpApiEndpoint.get("connect", "/connect/:chatId")
			.setPath(
				Schema.Struct({
					chatId: ChatId,
				}),
			)
			.addSuccess(Schema.Unknown)
			.addError(NotFound)
			.addError(Unauthorized),
	)
	.prefix("/sse") {}
