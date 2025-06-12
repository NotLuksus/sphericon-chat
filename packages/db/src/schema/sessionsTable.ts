import { relations } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { usersTable } from "./usersTable";

export const sessionsTable = pgTable("sessions", (t) => ({
	id: t.text().primaryKey(),
	expiresAt: t.timestamp().notNull(),
	token: t.text().notNull().unique(),
	createdAt: t.timestamp().notNull(),
	updatedAt: t.timestamp().notNull(),
	ipAddress: t.text(),
	userAgent: t.text(),
	userId: t
		.text()
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [sessionsTable.userId],
		references: [usersTable.id],
	}),
}));
