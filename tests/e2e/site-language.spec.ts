import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { hashPassword } from "../../src/server/password";
import { selectLanguage } from "./helpers/select-language";

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

test("legacy IP practice retains answers and reset behavior in BM", async ({
	page,
	context,
	baseURL,
}) => {
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Local-only practice fixture",
	);
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw new Error("Practice fixtures are local-only");
	const id = `ip-language-${Date.now()}`;
	try {
		sql(
			`INSERT INTO courses(id,slug,title,description,published,content_language) VALUES ('${id}','${id}','IP fixture','Latihan alamat IP',1,'ms'); INSERT INTO sections(id,course_id,title) VALUES ('${id}','${id}','IP'); INSERT INTO lessons(id,section_id,title,content,published,preview,lesson_type,activity) VALUES ('${id}','${id}','Latihan IP','Latihan alamat IP',1,1,'quiz','quiz');`,
		);
		await context.addCookies([
			{ name: "PARAGLIDE_LOCALE", value: "ms", url: baseURL },
		]);
		await page.goto(`/learn/${id}/${id}`);
		const lab = page.locator(".ip-lab");
		const check = lab.getByRole("button", {
			name: "Semak jawapan",
			exact: true,
		});
		await expect(check).toBeDisabled();
		const groups = lab.locator("fieldset");
		const answers = [
			"192.168.1.10",
			"172.16.0.1",
			"24",
			"192.168.1.128",
			"254",
		];
		for (let i = 0; i < answers.length; i++)
			await groups
				.nth(i)
				.getByRole("radio", { name: answers[i], exact: true })
				.check();
		await check.click();
		await expect(
			lab
				.getByRole("status")
				.filter({ hasText: "Skor anda ialah 5 daripada 5." }),
		).toBeVisible();
		await lab
			.getByRole("button", { name: "Set semula kuiz", exact: true })
			.click();
		await expect(
			lab.getByRole("progressbar", { name: "Soalan dijawab", exact: true }),
		).toHaveAttribute("aria-valuenow", "0");
		await expect(check).toBeDisabled();
		for (let i = 0; i < answers.length; i++)
			await groups
				.nth(i)
				.getByRole("radio", {
					name: i === 0 ? "192.168.1.256" : answers[i],
					exact: true,
				})
				.check();
		await check.click();
		await expect(
			groups
				.first()
				.getByText(/Belum tepat\. Jawapan yang betul ialah 192\.168\.1\.10/),
		).toBeVisible();
		await expect(
			lab
				.getByRole("status")
				.filter({ hasText: "Skor anda ialah 4 daripada 5." }),
		).toBeVisible();
	} finally {
		sql(`DELETE FROM courses WHERE id='${id}';`);
	}
});

test("auth pages switch between BM and EN without sending emails", async ({
	page,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/login");
	await selectLanguage(page, "ms");
	await expect(page.getByLabel("Alamat e-mel", { exact: true })).toBeVisible();
	await expect(page.getByLabel("Kata laluan", { exact: true })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Log masuk ↗", exact: true }),
	).toBeVisible();
	await page.goto("/register");
	await expect(page.getByLabel("Nama penuh", { exact: true })).toBeVisible();
	await page.goto("/forgot-password");
	await expect(
		page.getByRole("button", {
			name: "Hantar pautan penetapan semula ↗",
			exact: true,
		}),
	).toBeVisible();
	await selectLanguage(page, "en");
	await expect(
		page.getByRole("button", { name: "Send reset link ↗", exact: true }),
	).toBeVisible();
	expect(errors).toEqual([]);
});

test("BM covers account, orders, Studio screens and confirmation chrome", async ({
	page,
	context,
	baseURL,
}, testInfo) => {
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Opt-in local-only admin fixture",
	);
	test.setTimeout(120_000);
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw new Error("Localization fixtures are local-only");
	const id = `site-language-${Date.now()}`;
	const email = `${id}@example.test`;
	const password = "Site-language-fixture-57!";
	const hash = await hashPassword(password);
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	try {
		sql(
			`INSERT INTO user(id,name,email,email_verified,role,created_at,updated_at) VALUES ('${id}','Language Admin','${email}',1,'admin',0,0); INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${id}','${id}','credential','${id}','${hash}',0,0); INSERT INTO courses(id,slug,title,description,published) VALUES ('${id}','${id}','Language fixture','Authored content stays unchanged.',0); INSERT INTO sections(id,course_id,title) VALUES ('${id}','${id}','Fixture section'); INSERT INTO lessons(id,section_id,title,content,published,preview,lesson_type) VALUES ('${id}','${id}','Fixture lesson','Draft content',0,0,'reading');`,
		);
		await context.route("**/*", (route) =>
			["localhost", "127.0.0.1"].includes(
				new URL(route.request().url()).hostname,
			)
				? route.continue()
				: route.abort(),
		);
		await context.setExtraHTTPHeaders({ "cf-connecting-ip": "192.0.2.197" });
		await context.addCookies([
			{ name: "PARAGLIDE_LOCALE", value: "ms", url: baseURL },
		]);
		await page.goto("/login");
		await page.locator('[name="email"]').fill(email);
		await page.locator('[name="password"]').fill(password);
		await page.locator('button[type="submit"]').click();
		await expect(page).toHaveURL(/\/dashboard$/);
		await page.goto("/settings");
		await expect(
			page.getByRole("heading", { name: "Tetapan akaun", exact: true }),
		).toBeVisible();
		await expect(
			page.getByLabel("Kata laluan semasa", { exact: true }),
		).toBeVisible();
		await expect(
			page.getByLabel("Kata laluan baharu", { exact: true }),
		).toBeVisible();
		await page.goto("/orders");
		await expect(
			page.getByRole("heading", { name: "Pesanan saya", exact: true }),
		).toBeVisible();
		await expect(
			page.getByText("Belum ada pesanan.", { exact: true }),
		).toBeVisible();
		for (const path of [
			"/admin/courses",
			"/admin/products",
			"/admin/users",
			"/admin/access",
			"/admin/operations",
		]) {
			await page.goto(path);
			await expect(
				page.getByRole("heading", { name: "Studio pentadbir", exact: true }),
			).toBeVisible();
			await expect(
				page
					.getByRole("navigation", { name: "Studio pentadbir", exact: true })
					.getByRole("link", { name: "Jualan dan operasi", exact: true }),
			).toBeVisible();
			await expect(page.getByText("Loading…", { exact: true })).toHaveCount(0);
			await page.setViewportSize({ width: 375, height: 900 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth + 1,
				),
				path,
			).toBe(true);
		}
		await page.goto("/admin/operations");
		await page.getByRole("button", { name: "Resit", exact: true }).click();
		await page
			.getByRole("button", { name: "Cuba hantar semula resit", exact: true })
			.click();
		const confirmation = page.getByRole("dialog");
		await expect(
			confirmation.getByRole("heading", {
				name: "Sahkan tindakan",
				exact: true,
			}),
		).toBeVisible();
		await expect(
			confirmation.getByText(
				/E-mel resit akan dihantar kepada pelanggan berkenaan/,
			),
		).toBeVisible();
		await confirmation
			.getByRole("button", { name: "Batal", exact: true })
			.click();
		await expect(confirmation).toHaveCount(0);
		await page.goto(`/admin/courses/${id}/lessons/${id}`);
		await expect(
			page.getByLabel("Tajuk pelajaran", { exact: true }),
		).toHaveValue("Fixture lesson");
		await page
			.getByRole("button", { name: "Pratonton pelajaran", exact: true })
			.click();
		await expect(
			page.getByRole("dialog").getByText("Draft content", { exact: true }),
		).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator('[data-slot="dialog-content"]')).toHaveCount(0);
		await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
		await page.screenshot({
			path: testInfo.outputPath("studio-lesson-bm.png"),
			fullPage: true,
		});
		await selectLanguage(page, "en");
		await expect(page.getByLabel("Lesson title", { exact: true })).toHaveValue(
			"Fixture lesson",
		);
		await expect(
			page.getByRole("button", { name: "Preview lesson", exact: true }),
		).toBeVisible();
		expect(errors).toEqual([]);
	} finally {
		sql(
			`DELETE FROM audit_log WHERE actor_id='${id}'; DELETE FROM rate_limit WHERE key LIKE '%${email}%'; DELETE FROM courses WHERE id='${id}'; DELETE FROM user WHERE id='${id}';`,
		);
	}
});
