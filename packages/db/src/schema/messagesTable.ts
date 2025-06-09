import type { AiInput } from "@effect/ai";
import { relations } from "drizzle-orm";
import { foreignKey, pgEnum, pgTable } from "drizzle-orm/pg-core";
import { chatsTable } from "./chatsTable";
import { usersTable } from "./usersTable";

type MessagePart =
	| AiInput.UserMessagePart
	| AiInput.AssistantMessagePart
	| AiInput.ToolMessagePart;

export const messageStatusEnum = pgEnum("messageStatus", [
	"streaming",
	"completed",
]);

export const messagesTable = pgTable(
	"messages",
	(t) => ({
		id: t.text().primaryKey(),
		status: messageStatusEnum().notNull(),
		createdAt: t.timestamp().defaultNow(),
		updatedAt: t.timestamp().defaultNow(),
		parts: t.jsonb().$type<MessagePart[]>(),
		authorId: t
			.text()
			.notNull()
			.references(() => usersTable.id),
		chatId: t
			.text()
			.notNull()
			.references(() => chatsTable.id, { onDelete: "cascade" }),
		parentMessageId: t.text(),
	}),
	(t) => [
		foreignKey({
			columns: [t.parentMessageId],
			foreignColumns: [t.id],
			name: "fk_messages_parent_message_id",
		}),
	],
);

export const messagesTableRelations = relations(
	messagesTable,
	({ many, one }) => ({
		childMessages: many(messagesTable),
		parentMessage: one(messagesTable, {
			fields: [messagesTable.parentMessageId],
			references: [messagesTable.id],
		}),
	}),
);
