import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { Resource } from "sst";

const p = new pg.Pool({
	user: Resource.Database.username,
	password: Resource.Database.password,
	host: Resource.Database.host,
	port: Resource.Database.port,
	database: Resource.Database.database,
	idleTimeoutMillis: 0,
	connectionTimeoutMillis: 0,
});

const db = drizzle(p);

export const handler = async (event: any) => {
	await migrate(db, {
		migrationsFolder: "./migrations",
	});
};
