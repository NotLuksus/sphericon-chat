import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import { chatsTable } from "./chatsTable";
import { usersTable } from "./usersTable";

export const chatPermissionEnum = pgEnum("chat_permission", ["write", "read"]);

export const chatUsersTable = pgTable("chat_users", (t) => ({
	id: t.text().primaryKey(),
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
}));
