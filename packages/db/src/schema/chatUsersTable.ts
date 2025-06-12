import { relations } from "drizzle-orm";
import { foreignKey, pgEnum, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { chatsTable } from "./chatsTable";
import { usersTable } from "./usersTable";

export const chatPermissionEnum = pgEnum("chat_permission", ["write", "read"]);

export const chatUsersTable = pgTable(
  "chat_users",
  (t) => ({
    chatId: t
      .text()
      .notNull()
      .references(() => chatsTable.id, {
        onDelete: "cascade",
      }),
    userId: t.text().references(() => usersTable.id, {
      onDelete: "cascade",
    }),
    permission: chatPermissionEnum(),
    joinedAt: t.timestamp().notNull().defaultNow(),
  }),
  (t) => [
    primaryKey({
      columns: [t.userId, t.chatId],
    }),
  ],
);

export const chatUsersRelations = relations(chatUsersTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [chatUsersTable.userId],
    references: [usersTable.id],
  }),
  chat: one(chatsTable, {
    fields: [chatUsersTable.chatId],
    references: [chatsTable.id],
  }),
}));
