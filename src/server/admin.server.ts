import { requireSameOrigin, requireViewer } from "./auth";
import { runtime } from "./runtime";
export async function adminMutation() {
	requireSameOrigin();
	const actor = await requireViewer(true);
	await runtime()
		.db.prepare(
			"INSERT INTO audit_log(id,actor_id,action,entity_id,created_at) VALUES (?,?,?,?,?)",
		)
		.bind(
			crypto.randomUUID(),
			actor.id,
			"admin-mutation-attempt",
			"platform",
			Date.now(),
		)
		.run();
	return runtime().db;
}
