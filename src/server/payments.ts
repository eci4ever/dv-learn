import { z } from "zod";
import type { Viewer } from "./contracts";
import { products, rows } from "./data";
import { sendReceipt } from "./email";
import { runtime } from "./runtime";
import { signatureSource, verifyBillplzSignature } from "./signature";

const billSchema = z.object({
	id: z.string().min(1),
	url: z.string().url(),
	amount: z.number().int(),
	collection_id: z.string(),
	paid: z.boolean().optional(),
});
function paymentConfig() {
	const { env } = runtime();
	if (
		!env.BILLPLZ_SECRET_KEY ||
		!env.BILLPLZ_X_SIGNATURE_KEY ||
		!env.BILLPLZ_COLLECTION_ID
	)
		throw new Error("Billplz configuration is missing.");
	const mode = String(env.BILLPLZ_MODE).toLowerCase();
	if (!["sandbox", "live", "production"].includes(mode))
		throw new Error("BILLPLZ_MODE must be sandbox or live.");
	return {
		env,
		host:
			mode === "sandbox"
				? "https://www.billplz-sandbox.com"
				: "https://www.billplz.com",
	};
}
export async function createCheckout(
	user: Viewer,
	productId: string,
): Promise<{ orderId: string; url: string }> {
	const { db } = runtime();
	const { env, host } = paymentConfig();
	const product = (await products()).find((p) => p.id === productId);
	if (!product?.courseIds.length) throw new Error("Product is not available.");
	const unpublished = await rows<{ id: string }>(
		"SELECT c.id FROM product_courses pc JOIN courses c ON c.id=pc.course_id WHERE pc.product_id=? AND (c.published=0 OR c.archived=1)",
		productId,
	);
	if (unpublished.length)
		throw new Error("Product contains an unavailable course.");
	const existing = await db
		.prepare(
			"SELECT id,payment_url AS url FROM orders WHERE user_id=? AND product_id=? AND status IN ('creating','pending')",
		)
		.bind(user.id, productId)
		.first<{ id: string; url: string | null }>();
	if (existing?.url) return { orderId: existing.id, url: existing.url };
	if (existing)
		throw new Error(
			"A payment is already being prepared. If this persists, contact support to reconcile the order before retrying.",
		);
	const orderId = crypto.randomUUID();
	const attemptId = crypto.randomUUID();
	const now = Date.now();
	try {
		await db.batch([
			db
				.prepare(
					"INSERT INTO orders(id,user_id,product_id,product_title,amount_cents,currency,status,created_at,collection_id) VALUES (?,?,?,?,?,?,'creating',?,?)",
				)
				.bind(
					orderId,
					user.id,
					productId,
					product.title,
					product.priceCents,
					"MYR",
					now,
					env.BILLPLZ_COLLECTION_ID,
				),
			...product.courseIds.map((courseId) =>
				db
					.prepare("INSERT INTO order_courses(order_id,course_id) VALUES (?,?)")
					.bind(orderId, courseId),
			),
			db
				.prepare(
					"INSERT INTO payment_attempts(id,order_id,status,created_at) VALUES (?,?,'creating',?)",
				)
				.bind(attemptId, orderId, now),
		]);
	} catch (error) {
		const pending = await db
			.prepare(
				"SELECT id,payment_url AS url FROM orders WHERE user_id=? AND product_id=? AND status IN ('creating','pending')",
			)
			.bind(user.id, productId)
			.first<{ id: string; url: string | null }>();
		if (pending?.url) return { orderId: pending.id, url: pending.url };
		if (pending)
			throw new Error("A payment is already being prepared. Please wait.");
		throw error;
	}
	const body = new URLSearchParams({
		collection_id: env.BILLPLZ_COLLECTION_ID,
		email: user.email,
		name: user.name,
		amount: String(product.priceCents),
		description: product.title,
		callback_url: new URL("/api/payments/billplz", env.BETTER_AUTH_URL).href,
		redirect_url: new URL("/orders", env.BETTER_AUTH_URL).href,
		reference_1_label: "Order ID",
		reference_1: orderId,
	});
	// Do not automatically retry bill creation: an ambiguous network failure may have created a bill.
	const response = await fetch(`${host}/api/v3/bills`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${btoa(`${env.BILLPLZ_SECRET_KEY}:`)}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
		signal: AbortSignal.timeout(15000),
	});
	if (!response.ok) {
		if (response.status >= 400 && response.status < 500)
			await db.batch([
				db
					.prepare(
						"UPDATE orders SET status='failed' WHERE id=? AND status='creating'",
					)
					.bind(orderId),
				db
					.prepare("UPDATE payment_attempts SET status='failed' WHERE id=?")
					.bind(attemptId),
			]);
		throw new Error(
			"Payment provider could not create the bill. Contact support if this persists.",
		);
	}
	const bill = billSchema.parse(await response.json());
	if (
		bill.amount !== product.priceCents ||
		bill.collection_id !== env.BILLPLZ_COLLECTION_ID ||
		new URL(bill.url).origin !== host
	)
		throw new Error("Unexpected payment provider response. Contact support.");
	await db.batch([
		db
			.prepare(
				"UPDATE orders SET bill_id=?,payment_url=?,status=CASE WHEN status='paid' THEN 'paid' ELSE 'pending' END WHERE id=?",
			)
			.bind(bill.id, bill.url, orderId),
		db
			.prepare(
				"UPDATE payment_attempts SET bill_id=?,payment_url=?,status=CASE WHEN status='paid' THEN 'paid' ELSE 'pending' END WHERE id=?",
			)
			.bind(bill.id, bill.url, attemptId),
	]);
	return { orderId, url: bill.url };
}
export async function billplzCallback(request: Request): Promise<Response> {
	if (
		!request.headers
			.get("content-type")
			?.startsWith("application/x-www-form-urlencoded")
	)
		return new Response("Unsupported content type", { status: 415 });
	// Bound body size before parsing, including requests without Content-Length.
	const reader = request.body?.getReader();
	if (!reader) return new Response("Missing body", { status: 400 });
	const chunks: Uint8Array[] = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.length;
		if (size > 16384) {
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
	const params = new URLSearchParams(new TextDecoder().decode(bytes));
	const { env } = paymentConfig();
	const { db } = runtime();
	if (!(await verifyBillplzSignature(params, env.BILLPLZ_X_SIGNATURE_KEY)))
		return new Response("Invalid signature", { status: 401 });
	const billId = params.get("id");
	if (!billId) return new Response("Missing bill", { status: 400 });
	let order = await db
		.prepare(
			"SELECT id,user_id AS userId,amount_cents AS amountCents,collection_id AS collectionId,status FROM orders WHERE bill_id=?",
		)
		.bind(billId)
		.first<{
			id: string;
			userId: string;
			amountCents: number;
			collectionId: string;
			status: string;
		}>();
	// Callback can arrive before create-bill response. Bind using the signed snapshot reference.
	if (!order && params.get("reference_1"))
		order = await db
			.prepare(
				"SELECT id,user_id AS userId,amount_cents AS amountCents,collection_id AS collectionId,status FROM orders WHERE id=? AND bill_id IS NULL AND status='creating'",
			)
			.bind(params.get("reference_1"))
			.first();
	if (!order) return new Response("Unknown bill", { status: 404 });
	if (
		params.get("collection_id") !== order.collectionId ||
		params.get("amount") !== String(order.amountCents)
	)
		return new Response("Payment mismatch", { status: 400 });
	if (params.get("paid") !== "true") return new Response("Accepted");
	if (params.get("paid_amount") !== String(order.amountCents))
		return new Response("Paid amount mismatch", { status: 400 });
	const now = Date.now();
	await db.batch([
		db
			.prepare(
				"INSERT OR IGNORE INTO payment_events(id,order_id,bill_id,paid,created_at) VALUES (?,?,?,1,?)",
			)
			.bind(params.get("x_signature"), order.id, billId, now),
		db
			.prepare(
				"UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,?),bill_id=COALESCE(bill_id,?) WHERE id=? AND (bill_id IS NULL OR bill_id=?)",
			)
			.bind(now, billId, order.id, billId),
		db
			.prepare(
				"UPDATE payment_attempts SET status='paid',bill_id=COALESCE(bill_id,?) WHERE order_id=? AND (bill_id IS NULL OR bill_id=?)",
			)
			.bind(billId, order.id, billId),
		db
			.prepare(
				"INSERT OR IGNORE INTO course_access(id,user_id,course_id,source,source_id,created_at) SELECT ? || ':' || oc.course_id,o.user_id,oc.course_id,'order',o.id,? FROM order_courses oc JOIN orders o ON o.id=oc.order_id WHERE o.id=? AND o.status='paid' AND o.bill_id=?",
			)
			.bind(order.id, now, order.id, billId),
		db
			.prepare(
				"INSERT OR IGNORE INTO enrollments(user_id,course_id,order_id,created_at) SELECT o.user_id,oc.course_id,o.id,? FROM order_courses oc JOIN orders o ON o.id=oc.order_id WHERE o.id=? AND o.status='paid' AND o.bill_id=?",
			)
			.bind(now, order.id, billId),
		db
			.prepare(
				"INSERT OR IGNORE INTO email_outbox(id,order_id,recipient) SELECT ?,o.id,u.email FROM orders o JOIN user u ON u.id=o.user_id WHERE o.id=? AND o.status='paid' AND o.bill_id=?",
			)
			.bind(crypto.randomUUID(), order.id, billId),
	]);
	try {
		await sendReceipt(order.id);
	} catch {
		return new Response("Receipt pending; retry callback", { status: 503 });
	}
	return new Response("Accepted");
}
export async function reconcilePayment(user: Viewer, orderId: string) {
	const { db } = runtime();
	const order = await db
		.prepare(
			"SELECT id,user_id AS userId,bill_id AS billId,status FROM orders WHERE id=?",
		)
		.bind(orderId)
		.first<{
			id: string;
			userId: string;
			billId: string | null;
			status: string;
		}>();
	if (!order || (user.role !== "admin" && order.userId !== user.id))
		throw new Error("Order not found.");
	if (!order.billId)
		throw new Error(
			"Bill ID belum diterima. Hubungi sokongan sebelum mencuba pembayaran baharu.",
		);
	const { env, host } = paymentConfig();
	const response = await fetch(
		`${host}/api/v3/bills/${encodeURIComponent(order.billId)}`,
		{
			headers: { Authorization: `Basic ${btoa(`${env.BILLPLZ_SECRET_KEY}:`)}` },
			signal: AbortSignal.timeout(15000),
		},
	);
	if (!response.ok) throw new Error("Status pembayaran belum dapat disemak.");
	const bill = z
		.object({
			id: z.string(),
			collection_id: z.string(),
			amount: z.number().int(),
			paid_amount: z.number().int(),
			paid: z.boolean(),
		})
		.parse(await response.json());
	if (bill.id !== order.billId) throw new Error("Payment identity mismatch.");
	if (!bill.paid) return { paid: false };
	const params = new URLSearchParams({
		id: bill.id,
		collection_id: bill.collection_id,
		amount: String(bill.amount),
		paid_amount: String(bill.paid_amount),
		paid: "true",
	});
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(env.BILLPLZ_X_SIGNATURE_KEY),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(signatureSource(params)),
	);
	params.set(
		"x_signature",
		Array.from(new Uint8Array(signature), (byte) =>
			byte.toString(16).padStart(2, "0"),
		).join(""),
	);
	const result = await billplzCallback(
		new Request(new URL("/api/payments/billplz", env.BETTER_AUTH_URL), {
			method: "POST",
			body: params,
		}),
	);
	if (!result.ok && result.status !== 503)
		throw new Error("Payment could not be reconciled.");
	return { paid: true };
}
