import { relations } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { usersTable } from "./usersTable";

export const accountsTable = pgTable("accounts", (t) => ({
	id: t.text().primaryKey(),
	accountId: t.text().notNull(),
	providerId: t.text().notNull(),
	userId: t
		.text()
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
	accessToken: t.text(),
	refreshToken: t.text(),
	idToken: t.text(),
	accessTokenExpiresAt: t.timestamp(),
	refreshTokenExpiresAt: t.timestamp(),
	scope: t.text(),
	password: t.text(),
	createdAt: t.timestamp().notNull(),
	updatedAt: t.timestamp().notNull(),
}));

export const accountRelations = relations(accountsTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [accountsTable.userId],
		references: [usersTable.id],
	}),
}));
