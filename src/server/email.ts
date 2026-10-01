import { Resend } from "resend";
import { runtime } from "./runtime";
export async function sendEmail(
	to: string,
	subject: string,
	text: string,
	idempotencyKey?: string,
) {
	const { env } = runtime();
	if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
		throw new Error("Email requires RESEND_API_KEY and EMAIL_FROM.");
	const result = await new Resend(env.RESEND_API_KEY).emails.send(
		{
			from: env.EMAIL_FROM,
			to,
			subject,
			text,
			...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
		},
		idempotencyKey ? { idempotencyKey } : undefined,
	);
	if (result.error) throw new Error("Email delivery failed. Please try again.");
}
const escapeHtml = (value: string) =>
	value.replace(
		/[&<>"']/g,
		(character) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				character
			] ?? character,
	);
export async function sendReceipt(orderId: string) {
	const { env, db } = runtime();
	const receipt = await db
		.prepare(
			"SELECT e.id,e.recipient,e.sent_at AS sentAt,o.product_title AS title,o.amount_cents AS amountCents FROM email_outbox e JOIN orders o ON o.id=e.order_id WHERE e.order_id=?",
		)
		.bind(orderId)
		.first<{
			id: string;
			recipient: string;
			sentAt: number | null;
			title: string;
			amountCents: number;
		}>();
	if (!receipt || receipt.sentAt) return;
	await db
		.prepare("UPDATE email_outbox SET attempts=attempts+1 WHERE id=?")
		.bind(receipt.id)
		.run();
	try {
		if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
			throw new Error("Email configuration missing");
		const brand = env.EMAIL_BRAND_NAME || "DV Learn";
		const amount = `RM ${(receipt.amountCents / 100).toFixed(2)}`;
		const link = new URL("/dashboard", env.BETTER_AUTH_URL).href;
		const support = env.EMAIL_SUPPORT || env.EMAIL_REPLY_TO || "";
		const result = await new Resend(env.RESEND_API_KEY).emails.send(
			{
				from: env.EMAIL_FROM,
				to: receipt.recipient,
				subject: `${brand}: payment receipt`,
				...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
				text: `Thank you for your purchase of ${receipt.title}. Paid: ${amount}. Order: ${orderId}. Your courses: ${link}${support ? `\nSupport: ${support}` : ""}`,
				html: `<html><body style="font-family:Arial,sans-serif;color:#172b2a;max-width:600px;margin:32px auto"><h1>${escapeHtml(brand)}</h1><h2>Your courses are ready</h2><p>Thank you for purchasing ${escapeHtml(receipt.title)}.</p><p>Paid: <strong>${amount}</strong></p><p>Order: ${escapeHtml(orderId)}</p><p><a href="${escapeHtml(link)}">Start learning</a></p>${support ? `<p>Need help? Contact ${escapeHtml(support)}</p>` : ""}</body></html>`,
			},
			{ idempotencyKey: `receipt/${orderId}` },
		);
		if (result.error) throw new Error(result.error.name);
		await db
			.prepare(
				"UPDATE email_outbox SET sent_at=?,provider_id=?,delivery_status=COALESCE((SELECT event_type FROM email_events WHERE provider_id=? ORDER BY created_at DESC LIMIT 1),'email.sent'),last_error=NULL WHERE id=?",
			)
			.bind(
				Date.now(),
				result.data?.id ?? null,
				result.data?.id ?? null,
				receipt.id,
			)
			.run();
	} catch {
		await db
			.prepare(
				"UPDATE email_outbox SET last_error='Delivery failed; retry required' WHERE id=?",
			)
			.bind(receipt.id)
			.run();
		throw new Error("Receipt delivery pending");
	}
}
