import { relations } from "drizzle-orm";
import { foreignKey, pgTable, type AnyPgColumn } from "drizzle-orm/pg-core";
import { chatUsersTable } from "./chatUsersTable";
import { messagesTable } from "./messagesTable";
import { usersTable } from "./usersTable";

export const chatsTable = pgTable("chats", (t) => ({
  id: t.text().primaryKey(),
  title: t.text().notNull(),
  createdAt: t.timestamp().notNull().defaultNow(),
  updatedAt: t.timestamp().notNull().defaultNow(),
  creatorId: t
    .text()
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
    }),
  activeMessageId: t.text(),
}));

export const chatsTableRelations = relations(chatsTable, ({ many }) => ({
  users: many(chatUsersTable),
  messages: many(messagesTable),
}));
