import { relations } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { accountsTable } from "./accountsTable";
import { chatUsersTable } from "./chatUsersTable";
import { sessionsTable } from "./sessionsTable";

export const usersTable = pgTable("users", (t) => ({
	id: t.text().primaryKey(),
	name: t.text().notNull(),
	email: t.text().notNull().unique(),
	emailVerified: t.boolean().notNull(),
	image: t.text(),
	createdAt: t.timestamp().notNull(),
	updatedAt: t.timestamp().notNull(),
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
	accounts: many(accountsTable),
	sessions: many(sessionsTable),
	chats: many(chatUsersTable),
}));
