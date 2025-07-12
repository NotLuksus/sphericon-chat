// Pure schemas without server dependencies
import { Schema } from "effect";

// Chat schemas
export const ChatId = Schema.String.pipe(Schema.brand("ChatId"));
export type ChatId = typeof ChatId.Type;

// SSE Event schemas
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