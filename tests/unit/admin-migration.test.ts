import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

it("migrates legacy admins without promoting students or losing accounts", () => {
	const sqlite = new DatabaseSync(":memory:");
	try {
		const root = new URL("../../migrations/", import.meta.url);
		for (const file of readdirSync(root)
			.filter((name) => name.endsWith(".sql") && name < "0007")
			.sort())
			sqlite.exec(readFileSync(new URL(file, root), "utf8"));
		sqlite.exec(
			"INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('admin','Admin','admin@example.test',1,0,0),('student','Student','student@example.test',1,0,0); INSERT INTO admins(user_id) VALUES ('admin');",
		);
		sqlite.exec(
			readFileSync(new URL("0007_better_auth_admin.sql", root), "utf8"),
		);
		expect(
			sqlite.prepare("SELECT id,role,banned FROM user ORDER BY id").all(),
		).toEqual([
			{ id: "admin", role: "admin", banned: 0 },
			{ id: "student", role: "user", banned: 0 },
		]);
		expect(
			sqlite.prepare("SELECT user_id,completed FROM auth_bootstrap").all(),
		).toEqual([{ user_id: "admin", completed: 1 }]);
	} finally {
		sqlite.close();
	}
});
