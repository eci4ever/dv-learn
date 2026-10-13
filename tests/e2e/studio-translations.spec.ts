import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
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

test("Studio translations persist, protect edits and fall back when originals change", async ({
	page,
	context,
	baseURL,
}) => {
	test.setTimeout(150_000);
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Local-only fixture.",
	);
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw new Error("Local-only fixture.");
	const id = `translations-${Date.now()}`;
	const email = `${id}@example.test`;
	const password = "Local-translation-fixture-59!";
	const hash = await hashPassword(password);
	sql(`INSERT INTO user(id,name,email,email_verified,role,created_at,updated_at) VALUES ('${id}','Translation Admin','${email}',1,'admin',0,0);
INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${id}','${id}','credential','${id}','${hash}',0,0);
INSERT INTO courses(id,slug,title,description,published,content_language) VALUES ('${id}','${id}','Translation Fixture','Learn how DNS works',1,'en');
INSERT INTO sections(id,course_id,title) VALUES ('${id}','${id}','Original section');
INSERT INTO lessons(id,section_id,title,content,lesson_type,published,preview) VALUES ('${id}','${id}','Original reading','Original reading text','reading',1,1);`);
	try {
		await context.route("**/*", (route) =>
			["localhost", "127.0.0.1"].includes(
				new URL(route.request().url()).hostname,
			)
				? route.continue()
				: route.abort(),
		);
		await context.setExtraHTTPHeaders({ "cf-connecting-ip": "192.0.2.196" });
		await page.goto("/login");
		await page.locator('input[name="email"]').fill(email);
		await page.locator('input[name="password"]').fill(password);
		await page.locator('button[type="submit"]').click();
		await expect(page).toHaveURL(/\/dashboard$/);
		await page.goto(`/admin/courses/${id}?tab=translations`);
		const title = page.getByLabel("Translated Title (Bahasa Melayu)", {
			exact: true,
		});
		await title.fill("Asas DNS");
		await page
			.getByLabel("Translated Description (Bahasa Melayu)", { exact: true })
			.fill("Belajar bagaimana DNS berfungsi");
		await page
			.getByLabel("Translated Level (Bahasa Melayu)", { exact: true })
			.fill("Pemula");
		const save = page.getByRole("button", { name: "Save", exact: true });
		await save.click();
		await expect(page.getByText("Ready", { exact: true })).toBeVisible();
		await title.fill("Asas DNS dikemas kini");
		await save.click();
		await expect(page.getByText("Saved", { exact: true })).toBeVisible();
		await page.reload();
		await expect(title).toHaveValue("Asas DNS dikemas kini");
		await page
			.getByLabel("Content to translate", { exact: true })
			.selectOption("lesson");
		await page.getByRole("button", { name: /Original reading/ }).click();
		const content = page.getByLabel(
			"Translated Reading content (Bahasa Melayu)",
			{ exact: true },
		);
		await title.fill("Bacaan DNS");
		await content.fill("Kandungan DNS dalam Bahasa Melayu.");
		await save.click();
		await expect(page.getByText("Saved", { exact: true })).toBeVisible();
		await title.fill("Unsaved title");
		await page
			.getByLabel("Content to translate", { exact: true })
			.selectOption("section");
		await page
			.getByRole("dialog")
			.getByRole("button", { name: "Cancel", exact: true })
			.click();
		await expect(title).toHaveValue("Unsaved title");
		sql(
			`UPDATE lessons SET content='Changed original reading text' WHERE id='${id}';`,
		);
		await save.click();
		await expect(
			page.locator('p[role="alert"]').filter({
				hasText: /The original or translation changed while you were editing/,
			}),
		).toBeVisible();
		await expect(title).toHaveValue("Unsaved title");
		await page
			.getByRole("button", { name: "Discard changes", exact: true })
			.click();
		await expect(
			page.getByText("Needs update", { exact: true }).last(),
		).toBeVisible();
		await expect(
			page.getByLabel("Original Reading content (English)", { exact: true }),
		).toHaveValue("Changed original reading text");
		await content.fill("Kandungan DNS telah dikemas kini.");
		await save.click();
		await expect(page.getByText("Saved", { exact: true })).toBeVisible();
		await page.setViewportSize({ width: 375, height: 812 });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
		).toBe(true);
		await page.goto(`/learn/${id}/${id}`);
		await selectLanguage(page, "ms");
		await expect(
			page.getByText("Kandungan DNS telah dikemas kini.", { exact: true }),
		).toBeVisible();
		await selectLanguage(page, "en");
		await expect(
			page.getByText("Changed original reading text", { exact: true }),
		).toBeVisible();
	} finally {
		sql(
			`DELETE FROM audit_log WHERE actor_id='${id}'; DELETE FROM courses WHERE id='${id}'; DELETE FROM user WHERE id='${id}'; DELETE FROM rate_limit WHERE key LIKE '%${email}%';`,
		);
	}
});
