import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export const ChatId = Schema.String.pipe(Schema.brand("ChatId"));
export type ChatId = typeof ChatId.Type;

export class ChatNotFoundError extends Schema.TaggedError<ChatNotFoundError>(
  "ChatNotFoundError",
)(
  "ChatNotFoundError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({
    status: 404,
  }),
) {}
