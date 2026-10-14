import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { hashPassword } from "../../src/server/password";
import { selectLanguage } from "./helpers/select-language";

test.use({ actionTimeout: 15_000 });

function sql(command: string) {
	execFileSync(
		"node_modules/.bin/wrangler",
		[
			"d1",
			"execute",
			"DB",
			"--config",
			"wrangler.jsonc",
			"--local",
			"--command",
			command,
		],
		{ stdio: "pipe" },
	);
}

async function adminFixture(
	page: Page,
	baseURL: string | undefined,
	run: (id: string) => Promise<void>,
) {
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw new Error("Local-only audit fixtures.");
	const id = `browser-audit-${randomUUID()}`;
	const email = `${id}@example.test`;
	const fixtureIP = `2001:db8:${randomUUID().replaceAll("-", "").slice(0, 24).match(/.{4}/g)?.join(":")}`;
	const password = "Local-browser-audit-fixture-61!";
	const hash = await hashPassword(password);
	try {
		sql(`INSERT INTO user(id,name,email,email_verified,role,created_at,updated_at) VALUES ('${id}','Browser Audit Admin','${email}',1,'admin',0,0);
INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${id}','${id}','credential','${id}','${hash}',0,0);
INSERT INTO courses(id,slug,title,description,published) VALUES ('${id}','${id}','Browser audit course','A local audit course',1);
INSERT INTO sections(id,course_id,title) VALUES ('${id}','${id}','Audit section');
INSERT INTO lessons(id,section_id,title,content,lesson_type,published,preview) VALUES ('${id}','${id}','Audit reading','Local audit reading content','reading',1,1);
INSERT INTO products(id,title,description,price_cents,active) VALUES ('${id}','Audit product','Local product',1000,1);
INSERT INTO product_courses(product_id,course_id) VALUES ('${id}','${id}');`);
		await page
			.context()
			.route("**/*", (route) =>
				["localhost", "127.0.0.1"].includes(
					new URL(route.request().url()).hostname,
				)
					? route.continue()
					: route.abort(),
			);
		await page.context().setExtraHTTPHeaders({ "cf-connecting-ip": fixtureIP });
		await page.goto("/login");
		await page.locator('input[name="email"]').fill(email);
		await page.locator('input[name="password"]').fill(password);
		await page.locator('button[type="submit"]').click();
		await expect(page).toHaveURL(/\/dashboard$/);
		await run(id);
	} finally {
		sql(
			`DELETE FROM audit_log WHERE actor_id='${id}'; DELETE FROM products WHERE id='${id}'; DELETE FROM courses WHERE id='${id}'; DELETE FROM user WHERE id='${id}'; DELETE FROM rate_limit WHERE instr(key,'${email}')>0 OR instr(key,'${fixtureIP}')>0;`,
		);
	}
}

test("overflowing admin tables expose a visible cue and native keyboard scrolling", async ({
	page,
	baseURL,
}) => {
	test.setTimeout(90_000);
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Local-only admin fixture.",
	);
	await adminFixture(page, baseURL, async (id) => {
		await page.setViewportSize({ width: 320, height: 760 });
		await page.goto("/admin/users");
		await expect(
			page.getByRole("cell").filter({ hasText: `${id}@example.test` }),
		).toBeVisible();
		const scroll = page.getByRole("region", {
			name: "Scrollable table",
			exact: true,
		});
		await expect(
			page.getByText("Scroll horizontally to see all columns.", {
				exact: false,
			}),
		).toBeVisible();
		await expect(scroll).toHaveAttribute("tabindex", "0");
		await page.screenshot({
			path: "/tmp/dv-learn-audit-table-mobile.jpg",
			type: "jpeg",
		});
		await scroll.focus();
		await page.keyboard.press("ArrowRight");
		await expect
			.poll(() => scroll.evaluate((e) => e.scrollLeft))
			.toBeGreaterThan(0);
		await scroll.press("End");
		await expect
			.poll(() => scroll.evaluate((e) => e.scrollLeft))
			.toBeGreaterThan(10);
		await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 320);
		await page.setViewportSize({ width: 1280, height: 900 });
		await expect(scroll).toHaveCount(0);
		await expect(
			page.getByText("Scroll horizontally to see all columns.", {
				exact: false,
			}),
		).toHaveCount(0);
		await page.setViewportSize({ width: 320, height: 760 });
		await expect(scroll).toBeVisible();
		await selectLanguage(page, "ms");
		await expect(
			page.getByRole("region", { name: "Jadual boleh discroll", exact: true }),
		).toBeVisible();
		await expect(
			page.getByText("Scroll ke kiri atau kanan untuk melihat semua kolum.", {
				exact: false,
			}),
		).toBeVisible();
	});
});

test("mobile admin can sign out using the keyboard in both interface languages", async ({
	page,
	baseURL,
}) => {
	test.setTimeout(90_000);
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Local-only admin fixture.",
	);
	await adminFixture(page, baseURL, async () => {
		await page.setViewportSize({ width: 320, height: 760 });
		await page.getByRole("button", { name: "Open menu", exact: true }).click();
		await expect(
			page
				.getByRole("dialog")
				.getByRole("button", { name: "Sign out", exact: true }),
		).toBeVisible();
		await expect
			.poll(() =>
				page
					.getByRole("dialog")
					.evaluate((element) =>
						element
							.getAnimations()
							.every((animation) => animation.playState !== "running"),
					),
			)
			.toBe(true);
		await page.screenshot({
			path: "/tmp/dv-learn-audit-mobile-menu.jpg",
			type: "jpeg",
		});
		await page.route("**/api/auth/sign-out", (route) =>
			route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ message: "Local simulated failure" }),
			}),
		);
		await page
			.getByRole("dialog")
			.getByRole("button", { name: "Sign out", exact: true })
			.click();
		await expect(
			page
				.getByRole("dialog")
				.getByText("Unable to sign out. Please try again.", { exact: true }),
		).toBeVisible();
		await expect(
			page
				.getByRole("dialog")
				.getByRole("button", { name: "Sign out", exact: true }),
		).toBeEnabled();
		await page.unroute("**/api/auth/sign-out");
		await page.keyboard.press("Escape");
		await selectLanguage(page, "ms");
		await page.getByRole("button", { name: "Buka menu", exact: true }).click();
		const logout = page
			.getByRole("dialog")
			.getByRole("button", { name: "Log keluar", exact: true });
		await logout.focus();
		await logout.press("Enter");
		await expect(page).toHaveURL(/\/$/);
		await page.getByRole("button", { name: "Buka menu", exact: true }).click();
		await expect(
			page
				.getByRole("dialog")
				.getByRole("link", { name: "Log masuk", exact: true }),
		).toBeVisible();
		await expect(
			page
				.getByRole("dialog")
				.getByRole("button", { name: "Log keluar", exact: true }),
		).toHaveCount(0);
	});
});

test("client-only theme restoration does not produce hydration warnings", async ({
	page,
}) => {
	const errors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	await page.addInitScript(() => localStorage.setItem("dv-theme", "dark"));
	for (const path of ["/", "/login", "/register"]) {
		await page.goto(path);
		await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
		await expect(
			page.getByRole("button", { name: "Light theme", exact: true }),
		).toBeEnabled();
	}
	expect(
		errors.filter((message) =>
			/hydrat|server rendered|didn't match/i.test(message),
		),
	).toEqual([]);
});

test("all Studio workspaces and learner account pages render in EN/BM without reflow errors", async ({
	page,
	baseURL,
}) => {
	test.setTimeout(180_000);
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Local-only admin fixture.",
	);
	await adminFixture(page, baseURL, async (id) => {
		const workspaces = [
			["/admin/courses", "Courses", "Kursus"],
			["/admin/courses/new", "New course", "Kursus baharu"],
			[`/admin/courses/${id}`, "Browser audit course", "Browser audit course"],
			[
				`/admin/courses/${id}?tab=content`,
				"Browser audit course",
				"Browser audit course",
			],
			[
				`/admin/courses/${id}?tab=translations`,
				"Browser audit course",
				"Browser audit course",
			],
			[`/admin/courses/${id}/sections/${id}`, "Audit section", "Audit section"],
			[`/admin/courses/${id}/sections/new`, "New section", "Bahagian baharu"],
			[`/admin/courses/${id}/lessons/${id}`, "Audit reading", "Audit reading"],
			[
				`/admin/courses/${id}/lessons/new-${id}`,
				"New lesson",
				"Pelajaran baharu",
			],
			["/admin/products", "Products", "Produk"],
			["/admin/products/new", "New product", "Produk baharu"],
			[`/admin/products/${id}`, "Audit product", "Audit product"],
			["/admin/users", "Users and roles", "Pengguna dan peranan"],
			["/admin/access", "Course access", "Akses kursus"],
			[
				"/admin/operations?tab=orders",
				"Sales and operations",
				"Jualan dan operasi",
			],
			[
				"/admin/operations?tab=receipts",
				"Sales and operations",
				"Jualan dan operasi",
			],
			[
				"/admin/operations?tab=audit",
				"Sales and operations",
				"Jualan dan operasi",
			],
		];
		for (const locale of ["en", "ms"] as const) {
			await selectLanguage(page, locale);
			await page.setViewportSize({
				width: locale === "en" ? 1280 : 320,
				height: 900,
			});
			for (const [path, en, ms] of workspaces) {
				await test.step(`${locale} ${path}`, async () => {
					await page.goto(path);
					await expect(
						page.getByRole("heading", {
							name: locale === "en" ? en : ms,
							exact: true,
						}),
					).toBeVisible();
					await expect(page.getByText(/^(Loading…|Memuatkan…)$/)).toHaveCount(
						0,
					);
					await expect(page.getByRole("main")).not.toContainText(
						/Page not found|Halaman tidak ditemui|Something went wrong|Forbidden|Unable to load/,
					);
					expect(
						await page.evaluate(
							() => document.documentElement.scrollWidth <= window.innerWidth,
						),
					).toBe(true);
				});
			}
			for (const [path, heading] of [
				[
					"/dashboard",
					locale === "en"
						? "Welcome back, Browser Audit Admin."
						: "Selamat kembali, Browser Audit Admin.",
				],
				["/orders", locale === "en" ? "My orders" : "Pesanan saya"],
				["/settings", locale === "en" ? "Account settings" : "Tetapan akaun"],
			]) {
				await page.goto(path);
				await expect(
					page.getByRole("heading", { name: heading, exact: true }),
				).toBeVisible();
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth <= window.innerWidth,
					),
				).toBe(true);
			}
		}
	});
});

test("long and multibyte Studio searches remain literal instead of exceeding D1 LIKE limits", async ({
	page,
	baseURL,
}) => {
	test.setTimeout(90_000);
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Local-only admin fixture.",
	);
	await adminFixture(page, baseURL, async (id) => {
		const term = `NETWORK-${"x".repeat(70)}%_`;
		sql(
			`UPDATE courses SET title='${term}' WHERE id='${id}'; UPDATE lessons SET title='${term}' WHERE id='${id}';`,
		);
		await page.goto("/admin/courses");
		await page
			.getByRole("searchbox", { name: "Search title or slug", exact: true })
			.fill("网".repeat(30));
		await expect(
			page.getByText("No matching records. Try another search or filter.", {
				exact: true,
			}),
		).toBeVisible();
		await page
			.getByRole("searchbox", { name: "Search title or slug", exact: true })
			.fill(term.toLowerCase());
		await expect(
			page.getByRole("link", { name: term, exact: true }),
		).toBeVisible();
		await page.goto(`/admin/courses/${id}?tab=translations`);
		await page
			.getByLabel("Content to translate", { exact: true })
			.selectOption("lesson");
		await page
			.getByRole("searchbox", { name: "Search original titles", exact: true })
			.fill("网".repeat(30));
		await expect(
			page.getByText("No matching records. Try another search or filter.", {
				exact: true,
			}),
		).toBeVisible();
		await page
			.getByRole("searchbox", { name: "Search original titles", exact: true })
			.fill(term.toLowerCase());
		await expect(
			page.getByRole("button", { name: `${term} Not translated`, exact: true }),
		).toBeVisible();
	});
});
