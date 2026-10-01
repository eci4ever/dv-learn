import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

/** Execute production SQL against SQLite, including D1's transactional batch semantics. */
export function sqliteD1() {
	const sqlite = new DatabaseSync(":memory:");
	const migrations = new URL("../../migrations/", import.meta.url);
	for (const file of readdirSync(migrations)
		.filter((name) => name.endsWith(".sql"))
		.sort()) {
		sqlite.exec(readFileSync(new URL(file, migrations), "utf8"));
	}
	function prepare(sql: string, params: SQLInputValue[] = []) {
		const statement = sqlite.prepare(sql);
		return {
			bind(...values: SQLInputValue[]) {
				return prepare(sql, values);
			},
			async run() {
				const result = statement.run(...params);
				return {
					success: true,
					results: [],
					meta: {
						changes: Number(result.changes),
						last_row_id: Number(result.lastInsertRowid),
					},
				};
			},
			async first(column?: string) {
				const row = statement.get(...params);
				return row ? (column ? row[column] : row) : null;
			},
			async all() {
				return { success: true, results: statement.all(...params), meta: {} };
			},
		};
	}
	const db = {
		prepare,
		async batch(statements: ReturnType<typeof prepare>[]) {
			sqlite.exec("BEGIN");
			try {
				const results = [];
				for (const statement of statements) results.push(await statement.run());
				sqlite.exec("COMMIT");
				return results;
			} catch (error) {
				sqlite.exec("ROLLBACK");
				throw error;
			}
		},
	};
	return { sqlite, db };
}
