import {
	type ChatId,
	ChatNotFoundError,
	MessageNotFoundError,
} from "@sphericon/api/domains";
import { Database } from "@sphericon/db";
import {
	type InsertChat,
	type InsertMessage,
	chatsTable,
	messagesTable,
} from "@sphericon/db/schema";
import { eq } from "@sphericon/db/sql";
import type { CoreMessage } from "ai";
import * as d from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export class ChatRepository extends Effect.Service<ChatRepository>()(
	"ChatRepository",
	{
		effect: Effect.gen(function* () {
			const db = yield* Database.Database;

			const update = db.makeQuery(
				(execute, input: Omit<Partial<InsertChat>, "id"> & { id: string }) =>
					execute((client) =>
						client
							.update(chatsTable)
							.set(input)
							.where(eq(chatsTable.id, input.id))
							.returning(),
					).pipe(
						Effect.flatMap(Array.head),
						Effect.catchTags({
							DatabaseError: Effect.die,
							NoSuchElementException: () =>
								new ChatNotFoundError({
									message: `Chat with id ${input.id} not found`,
								}),
						}),
						Effect.withSpan("ChatRepository.update"),
					),
			);

			return {
				update,
			};
		}),
	},
) {}
