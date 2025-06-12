import type { JSONValue } from "@rocicorp/zero";
import type { DBConnection, DBTransaction, Row } from "@rocicorp/zero/pg";

/**
 * Subset of the pg lib's `PoolClient` interface that we use.
 */
export type PgTransaction = {
	query(sql: string, params: JSONValue[]): Promise<{ rows: Row[] }>;
};

/**
 * Subset of the pg lib's `Pool` interface that we use.
 */
export type PgClient<Transaction extends PgTransaction> = {
	query(sql: string, params: JSONValue[]): Promise<{ rows: Row[] }>;
	connect(): Promise<Transaction & { release(): void }>;
};

class Transaction<WrappedTransaction extends PgTransaction>
	implements DBTransaction<WrappedTransaction>
{
	readonly wrappedTransaction: WrappedTransaction;
	constructor(pgTx: WrappedTransaction) {
		this.wrappedTransaction = pgTx;
	}

	async query(sql: string, params: unknown[]): Promise<Row[]> {
		const result = await this.wrappedTransaction.query(
			sql,
			params as JSONValue[],
		);
		return result.rows;
	}
}

/**
 * Implements the `DBConnection` interface needed by PushProcessor for the
 * pg library.
 */
export class PgConnection<
	WrappedTransaction extends PgTransaction,
	WrappedPg extends PgClient<WrappedTransaction>,
> implements DBConnection<WrappedTransaction>
{
	readonly #pg: WrappedPg;
	constructor(pg: WrappedPg) {
		this.#pg = pg;
	}

	async query(sql: string, params: unknown[]): Promise<Row[]> {
		const result = await this.#pg.query(sql, params as JSONValue[]);
		return result.rows;
	}

	async transaction<T>(
		fn: (tx: DBTransaction<WrappedTransaction>) => Promise<T>,
	): Promise<T> {
		const client = await this.#pg.connect();
		try {
			await client.query("BEGIN", []);
			const tx = new Transaction(client);
			const result = await fn(tx);
			await client.query("COMMIT", []);
			return result;
		} catch (error) {
			await client.query("ROLLBACK", []);
			throw error;
		} finally {
			client.release();
		}
	}
}

export function connectionProvider<
	WrappedTransaction extends PgTransaction,
	WrappedPg extends PgClient<WrappedTransaction>,
>(pg: WrappedPg): () => PgConnection<WrappedTransaction, WrappedPg> {
	return () => new PgConnection(pg);
}
