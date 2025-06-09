import { pgTable } from "drizzle-orm/pg-core";

export const jwksTable = pgTable("jwks", (t) => ({
	id: t.text().primaryKey(),
	publicKey: t.text().notNull(),
	privateKey: t.text().notNull(),
	createdAt: t.timestamp().notNull(),
}));
