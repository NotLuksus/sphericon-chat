import { relations } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { chatUsersTable } from "./chatUsersTable";
import { messagesTable } from "./messagesTable";
import { usersTable } from "./usersTable";

export const chatsTable = pgTable("chats", (t) => ({
	id: t.text().primaryKey(),
	title: t.text().notNull(),
	createdAt: t.timestamp().notNull(),
	updatedAt: t.timestamp().notNull(),
	creatorId: t
		.text()
		.notNull()
		.references(() => usersTable.id, {
			onDelete: "cascade",
		}),
}));

export const chatsTableRelations = relations(chatsTable, ({ many }) => ({
	users: many(chatUsersTable),
	messages: many(messagesTable),
}));
