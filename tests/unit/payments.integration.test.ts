import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sqliteD1 } from "./sqlite-d1";

const state = vi.hoisted(() => ({ runtime: null as unknown, send: vi.fn() }));
vi.mock("../../src/server/runtime", () => ({ runtime: () => state.runtime }));
vi.mock("resend", () => ({
	Resend: class {
		emails = { send: state.send };
	},
}));

import { access } from "../../src/server/data";
import {
	billplzCallback,
	createCheckout,
	reconcilePayment,
} from "../../src/server/payments";

const env = {
	BILLPLZ_SECRET_KEY: "test-only",
	BILLPLZ_X_SIGNATURE_KEY: "test-signing-key",
	BILLPLZ_COLLECTION_ID: "collection",
	BILLPLZ_MODE: "sandbox",
	BETTER_AUTH_URL: "https://learn.example.test",
	RESEND_API_KEY: "test-only",
	EMAIL_FROM: "test@example.test",
};
const student = {
	id: "student",
	email: "student@example.test",
	name: "Student",
	emailVerified: true,
	role: "student" as const,
};
let fixture: ReturnType<typeof sqliteD1>;
let orderId: string;

function callback(overrides: Record<string, string> = {}) {
	const params = new URLSearchParams({
		id: "bill",
		collection_id: "collection",
		amount: "1200",
		paid_amount: "1200",
		paid: "true",
		reference_1: orderId,
		...overrides,
	});
	// Independent provider-side signer; do not mock the production signature verifier.
	const source = [...params]
		.map(([key, value]) => `${key}${value}`)
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
		.join("|");
	params.set(
		"x_signature",
		createHmac("sha256", env.BILLPLZ_X_SIGNATURE_KEY)
			.update(source)
			.digest("hex"),
	);
	return new Request("https://learn.example.test/api/payments/billplz", {
		method: "POST",
		body: params,
	});
}
function query(sql: string) {
	return fixture.sqlite.prepare(sql).all();
}

beforeEach(async () => {
	fixture = sqliteD1();
	state.runtime = { db: fixture.db, env };
	state.send
		.mockReset()
		.mockResolvedValue({ data: { id: "email" }, error: null });
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			Response.json({
				id: "bill",
				url: "https://www.billplz-sandbox.com/bill",
				amount: 1200,
				collection_id: "collection",
			}),
		),
	);
	fixture.sqlite.exec(`
    INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('student','Student','student@example.test',1,0,0);
    INSERT INTO courses(id,slug,title,published) VALUES ('a','a','Course A',1),('b','b','Course B',1),('c','c','Course C',1);
    INSERT INTO products(id,title,price_cents,active) VALUES ('bundle','Original bundle',1200,1);
    INSERT INTO product_courses VALUES ('bundle','a'),('bundle','b');
  `);
	orderId = (await createCheckout(student, "bundle")).orderId;
});
afterEach(() => {
	fixture.sqlite.close();
	vi.unstubAllGlobals();
});

describe("payment callback using migrated SQLite", () => {
	it("reconciles Billplz for owner or admin while denying another user", async () => {
		await expect(
			reconcilePayment({ ...student, id: "other" }, orderId),
		).rejects.toThrow("Order not found");
		vi.mocked(fetch).mockResolvedValueOnce(
			Response.json({
				id: "bill",
				amount: 1200,
				paid_amount: 1200,
				paid: true,
				collection_id: "collection",
			}),
		);
		expect(
			await reconcilePayment(
				{ ...student, id: "admin", role: "admin" },
				orderId,
			),
		).toEqual({ paid: true });
		expect(await access("student", "a")).toBe(true);
		expect(state.send).toHaveBeenCalledTimes(1);
	});
	it("keeps paid access when receipt delivery fails and retries the receipt", async () => {
		state.send.mockResolvedValueOnce({
			data: null,
			error: { message: "Unavailable" },
		});
		expect((await billplzCallback(callback())).status).toBe(503);
		expect(query("SELECT status FROM orders")).toEqual([{ status: "paid" }]);
		expect(await access("student", "a")).toBe(true);
		expect((await billplzCallback(callback())).status).toBe(200);
		expect(query("SELECT * FROM course_access")).toHaveLength(2);
		expect(state.send).toHaveBeenCalledTimes(2);
	});

	it("does not restore revoked purchase grants on a repeated callback", async () => {
		await billplzCallback(callback());
		fixture.sqlite.exec(
			"UPDATE course_access SET revoked_at=1 WHERE source='order'; INSERT INTO course_access(id,user_id,course_id,source,source_id,created_at) VALUES ('manual','student','a','manual','admin',1);",
		);
		expect((await billplzCallback(callback())).status).toBe(200);
		expect(await access("student", "a")).toBe(true);
		expect(await access("student", "b")).toBe(false);
	});

	it.each<Record<string, string>>([
		{ amount: "1199" },
		{ paid_amount: "1199" },
		{ collection_id: "other" },
	])("rejects signed payment mismatches: %j", async (overrides) => {
		expect((await billplzCallback(callback(overrides))).status).toBe(400);
		expect(query("SELECT status FROM orders")).toEqual([{ status: "pending" }]);
		expect(query("SELECT * FROM enrollments")).toEqual([]);
		expect(query("SELECT * FROM course_access")).toEqual([]);
		expect(query("SELECT * FROM email_outbox")).toEqual([]);
		expect(state.send).not.toHaveBeenCalled();
	});

	it("rejects an invalid signature without changing the order", async () => {
		const request = callback();
		const params = new URLSearchParams(await request.text());
		params.set("x_signature", "0".repeat(64));
		expect(
			(
				await billplzCallback(
					new Request(request.url, { method: "POST", body: params }),
				)
			).status,
		).toBe(401);
		expect(query("SELECT status FROM orders")).toEqual([{ status: "pending" }]);
		expect(await access("student", "a")).toBe(false);
	});

	it("grants once on repeated callbacks and preserves the paid timestamp", async () => {
		expect((await billplzCallback(callback())).status).toBe(200);
		const paid = query("SELECT paid_at FROM orders");
		expect((await billplzCallback(callback())).status).toBe(200);
		expect(query("SELECT paid_at FROM orders")).toEqual(paid);
		expect(query("SELECT status FROM payment_attempts")).toEqual([
			{ status: "paid" },
		]);
		expect(
			query("SELECT course_id FROM enrollments ORDER BY course_id"),
		).toEqual([{ course_id: "a" }, { course_id: "b" }]);
		expect(
			query("SELECT course_id FROM course_access ORDER BY course_id"),
		).toEqual([{ course_id: "a" }, { course_id: "b" }]);
		expect(query("SELECT * FROM email_outbox")).toHaveLength(1);
		expect(state.send).toHaveBeenCalledTimes(1);
		expect(await access("student", "a")).toBe(true);
		expect(await access("someone-else", "a")).toBe(false);
	});

	it("rolls back payment and all grants when a grant fails, then permits retry", async () => {
		fixture.sqlite.exec(
			"CREATE TRIGGER fail_grant BEFORE INSERT ON course_access WHEN NEW.course_id='b' BEGIN SELECT RAISE(ABORT,'injected grant failure'); END;",
		);
		await expect(billplzCallback(callback())).rejects.toThrow(
			"injected grant failure",
		);
		expect(query("SELECT status,paid_at FROM orders")).toEqual([
			{ status: "pending", paid_at: null },
		]);
		expect(query("SELECT status FROM payment_attempts")).toEqual([
			{ status: "pending" },
		]);
		expect(query("SELECT * FROM course_access")).toEqual([]);
		expect(query("SELECT * FROM enrollments")).toEqual([]);
		expect(query("SELECT * FROM email_outbox")).toEqual([]);
		expect(state.send).not.toHaveBeenCalled();
		fixture.sqlite.exec("DROP TRIGGER fail_grant");
		expect((await billplzCallback(callback())).status).toBe(200);
		expect(query("SELECT * FROM enrollments")).toHaveLength(2);
	});

	it("fulfills the checkout snapshot after the live bundle and price change", async () => {
		fixture.sqlite.exec(
			"DELETE FROM product_courses; INSERT INTO product_courses VALUES ('bundle','c'); UPDATE products SET title='Changed bundle',price_cents=9900,active=0;",
		);
		expect((await billplzCallback(callback())).status).toBe(200);
		expect(query("SELECT product_title,amount_cents FROM orders")).toEqual([
			{ product_title: "Original bundle", amount_cents: 1200 },
		]);
		expect(await access("student", "a")).toBe(true);
		expect(await access("student", "b")).toBe(true);
		expect(await access("student", "c")).toBe(false);
	});
});
