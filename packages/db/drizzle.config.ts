import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

export default defineConfig({
	out: "./migrations",
	schema: "./src/schema/index.ts",
	dialect: "postgresql",
	casing: "snake_case",
	dbCredentials: {
		database: Resource.Database.database,
		host: Resource.Database.host,
		password: Resource.Database.password,
		user: Resource.Database.username,
		port: Resource.Database.port,
		ssl: process.env.NODE_ENV === "production",
	},
});
