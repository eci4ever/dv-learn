import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";
import { runtime } from "../../../server/runtime";
export const Route = createFileRoute("/api/email/resend")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { db, env } = runtime();
				const secret = String(env.RESEND_WEBHOOK_SECRET);
				if (!secret)
					return new Response("Webhook not configured", { status: 503 });
				const reader = request.body?.getReader();
				if (!reader) return new Response("Missing body", { status: 400 });
				const chunks: Uint8Array[] = [];
				let size = 0;
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					size += value.length;
					if (size > 65536) {
						await reader.cancel();
						return new Response("Too large", { status: 413 });
					}
					chunks.push(value);
				}
				const bytes = new Uint8Array(size);
				let offset = 0;
				for (const chunk of chunks) {
					bytes.set(chunk, offset);
					offset += chunk.length;
				}
				try {
					const eventId = request.headers.get("svix-id") ?? "";
					const event = new Resend(env.RESEND_API_KEY).webhooks.verify({
						payload: new TextDecoder().decode(bytes),
						headers: {
							id: eventId,
							timestamp: request.headers.get("svix-timestamp") ?? "",
							signature: request.headers.get("svix-signature") ?? "",
						},
						webhookSecret: secret,
					});
					if (
						!("email_id" in event.data) ||
						typeof event.data.email_id !== "string"
					)
						return new Response("Accepted");
					const at = Date.parse(event.created_at);
					if (!Number.isFinite(at))
						return new Response("Invalid date", { status: 400 });
					try {
						await db.batch([
							db
								.prepare(
									"INSERT OR IGNORE INTO email_events(id,provider_id,event_type,created_at) VALUES (?,?,?,?)",
								)
								.bind(eventId, event.data.email_id, event.type, at),
							db
								.prepare(
									"UPDATE email_outbox SET delivery_status=?,delivery_at=? WHERE provider_id=? AND delivery_at<=?",
								)
								.bind(event.type, at, event.data.email_id, at),
						]);
					} catch {
						return new Response("Storage unavailable; retry webhook", {
							status: 503,
						});
					}
					return new Response("Accepted");
				} catch {
					return new Response("Invalid webhook", {
						status: 400,
					});
				}
			},
		},
	},
});
