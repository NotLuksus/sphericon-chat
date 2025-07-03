import {
	AssistantMessage,
	type Message,
	TextPart,
	UserMessage,
} from "@effect/ai/AiInput";
import { type ChatId, MessageNotFoundError } from "@sphericon/api/domains";
import { Database } from "@sphericon/db";
import { type InsertMessage, messagesTable } from "@sphericon/db/schema";
import { eq } from "@sphericon/db/sql";
import type { CoreMessage } from "ai";
import * as d from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export class MessageRepository extends Effect.Service<MessageRepository>()(
	"MessageRepository",
	{
		effect: Effect.gen(function* () {
			const db = yield* Database.Database;

			const getForAiSdkByChat = Effect.fn("getForAiSdkByChat")(function* (
				chatId: ChatId,
			) {
				const messages = yield* db
					.execute((d) =>
						d.query.messagesTable.findMany({
							where: eq(messagesTable.chatId, chatId),
						}),
					)
					.pipe(
						Effect.map(
							Array.filterMap((message) =>
								message.content && message.content.trim().length > 0
									? Option.some(
											message.authorId
												? new UserMessage({
														parts: [new TextPart({ text: message.content })],
													})
												: new AssistantMessage({
														parts: [new TextPart({ text: message.content })],
													}),
										)
									: Option.none(),
							),
						),
						Effect.catchTag("DatabaseError", Effect.orDie),
					);

				return messages;
			});

			const create = db.makeQuery((execute, input: InsertMessage) =>
				execute((client) =>
					client.insert(messagesTable).values(input).returning(),
				).pipe(
					Effect.flatMap(Array.head),
					Effect.catchTags({
						DatabaseError: Effect.die,
						NoSuchElementException: () => Effect.dieMessage(""),
					}),
					Effect.withSpan("MessageRepository.create"),
				),
			);

			const update = db.makeQuery(
				(execute, input: Omit<Partial<InsertMessage>, "id"> & { id: string }) =>
					execute((client) =>
						client
							.update(messagesTable)
							.set(input)
							.where(eq(messagesTable.id, input.id))
							.returning(),
					).pipe(
						Effect.flatMap(Array.head),
						Effect.catchTags({
							DatabaseError: Effect.die,
							NoSuchElementException: () =>
								new MessageNotFoundError({
									message: `Message with id ${input.id} not found`,
								}),
						}),
						Effect.withSpan("MessageRepository.update"),
					),
			);

			return {
				create,
				update,
				getForAiSdkByChat,
			};
		}),
	},
) {}
