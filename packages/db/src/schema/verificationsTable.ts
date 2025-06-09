import { pgTable } from "drizzle-orm/pg-core";

export const verificationsTable = pgTable("verifications", (t) => ({
	id: t.text().primaryKey(),
	identifier: t.text().notNull(),
	value: t.text().notNull(),
	expiresAt: t.timestamp().notNull(),
	createdAt: t.timestamp(),
	updatedAt: t.timestamp(),
}));
