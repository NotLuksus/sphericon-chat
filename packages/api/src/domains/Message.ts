import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export const MessageId = Schema.String.pipe(Schema.brand("MessageId"));
export type MessageId = typeof MessageId.Type;

export class MessageNotFoundError extends Schema.TaggedError<MessageNotFoundError>(
  "MessageNotFoundError",
)(
  "MessageNotFoundError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({
    status: 404,
  }),
) {}
