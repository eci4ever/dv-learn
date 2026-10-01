import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
export function runtime() {
	if (!env.DB)
		throw new Error(
			"D1 DB binding is missing. Configure DB and apply migrations.",
		);
	return {
		env,
		db: env.DB.withSession("first-primary"),
		orm: drizzle(env.DB, { schema }),
	};
}
