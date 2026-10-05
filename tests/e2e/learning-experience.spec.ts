import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { hashPassword } from "../../src/server/password";

function sql(command: string) {
	execFileSync(
		"npm",
		[
			"exec",
			"--no",
			"--",
			"wrangler",
			"d1",
			"execute",
			"DB",
			"--local",
			"--command",
			command,
		],
		{ stdio: "pipe" },
	);
}

test("learning navigation, completion, resume and mobile contents use persisted progress", async ({
	page,
	context,
	baseURL,
	browser,
}, testInfo) => {
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Local-only authenticated fixture.",
	);
	test.setTimeout(90_000);
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw new Error("Learning fixtures are local-only.");
	const id = `learn-flow-${Date.now()}`;
	const email = `${id}@example.test`;
	const password = "Learning-fixture-only-57!";
	const hash = await hashPassword(password);
	sql(`INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('${id}','Learning Student','${email}',1,0,0);
INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${id}','${id}','credential','${id}','${hash}',0,0);
INSERT INTO courses(id,slug,title,published) VALUES ('${id}','${id}','Learning Experience Fixture',1);
INSERT INTO sections(id,course_id,title) VALUES ('${id}','${id}','Learning basics');
INSERT INTO lessons(id,section_id,title,content,published,preview,lesson_type,sort_order) VALUES ('${id}-1','${id}','First reading lesson','First lesson content',1,1,'reading',0),('${id}-2','${id}','Second reading lesson','Second lesson content',1,0,'reading',1);
INSERT INTO course_access(id,user_id,course_id,source,source_id,created_at) VALUES ('${id}','${id}','${id}','manual','manual',0);`);
	try {
		await context.route("**/*", (route) =>
			["localhost", "127.0.0.1"].includes(
				new URL(route.request().url()).hostname,
			)
				? route.continue()
				: route.abort(),
		);
		await context.setExtraHTTPHeaders({ "cf-connecting-ip": "192.0.2.178" });
		await page.goto("/login");
		await page.locator('input[name="email"]').fill(email);
		await page.locator('input[name="password"]').fill(password);
		await page.getByRole("button", { name: "Sign in ↗" }).click();
		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(
			page.getByRole("link", { name: "Resume lesson", exact: true }),
		).toHaveCount(0);
		await page.goto(`/learn/${id}/${id}-1`);
		expect(
			await page.locator(".lesson-content").evaluate((content) => {
				const completion = document.querySelector(
					'[aria-label="Lesson completion"]',
				);
				return Boolean(
					completion &&
						content.compareDocumentPosition(completion) &
							Node.DOCUMENT_POSITION_FOLLOWING,
				);
			}),
		).toBe(true);
		await expect(
			page.getByRole("progressbar", { name: "Course progress", exact: true }),
		).toHaveAttribute("aria-valuenow", "0");
		await expect(
			page.getByRole("link", { name: "Previous lesson" }),
		).toHaveCount(0);
		await page
			.getByRole("button", { name: "Mark as complete", exact: true })
			.click();
		await expect(
			page.getByRole("button", { name: "✓ Complete", exact: true }),
		).toBeDisabled();
		await expect(
			page.getByRole("progressbar", { name: "Course progress", exact: true }),
		).toHaveAttribute("aria-valuenow", "50");
		await page.screenshot({
			path: testInfo.outputPath("learning-desktop.png"),
			animations: "disabled",
			fullPage: true,
		});
		await page.getByRole("link", { name: "Continue to next lesson" }).click();
		await expect(
			page.getByRole("heading", { name: "Second reading lesson", exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Mark as complete", exact: true }),
		).toBeEnabled();
		await page.goto("/dashboard");
		await expect(
			page.getByRole("link", { name: "Resume lesson", exact: true }),
		).toHaveAttribute("href", `/learn/${id}/${id}-2`);
		await expect(
			page.getByText("Up next: Second reading lesson"),
		).toBeVisible();
		await page.screenshot({
			path: testInfo.outputPath("learning-dashboard.png"),
			animations: "disabled",
			fullPage: true,
		});
		await page
			.getByRole("link", { name: "Resume lesson", exact: true })
			.click();
		await page.setViewportSize({ width: 375, height: 812 });
		await expect(page.locator(".learning-desktop-outline")).toBeHidden();
		await page
			.getByRole("button", { name: "Course content", exact: true })
			.click();
		const drawer = page.getByRole("dialog");
		await expect(drawer.getByText("1 of 2 lessons complete")).toBeVisible();
		await expect(
			drawer.getByRole("link", { name: /First reading lesson.*Completed/ }),
		).toBeVisible();
		await page.screenshot({
			path: testInfo.outputPath("learning-mobile-drawer.png"),
			animations: "disabled",
			fullPage: true,
		});
		await drawer.getByRole("link", { name: /First reading lesson/ }).click();
		await expect(drawer).toBeHidden();
		await expect(
			page.getByRole("heading", { name: "First reading lesson", exact: true }),
		).toBeVisible();
		await page.getByRole("link", { name: "Continue to next lesson" }).click();
		await page
			.getByRole("button", { name: "Mark as complete", exact: true })
			.click();
		await expect(
			page.getByText("Course complete. Well done!", { exact: false }),
		).toBeVisible();
		await page.reload();
		await expect(
			page.getByRole("button", { name: "✓ Complete", exact: true }),
		).toBeDisabled();
		for (const width of [320, 375, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth,
				),
			).toBe(true);
		}
		await page.goto("/dashboard");
		await expect(page.getByText("100% complete")).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Resume lesson", exact: true }),
		).toHaveCount(0);
		const guest = await browser.newContext({
			baseURL,
			viewport: { width: 320, height: 812 },
		});
		try {
			const preview = await guest.newPage();
			await preview.goto(`/learn/${id}/${id}-1`);
			await expect(
				preview.getByRole("button", { name: "Mark as complete", exact: true }),
			).toBeDisabled();
			await expect(
				preview.getByRole("link", { name: "Get course access", exact: true }),
			).toHaveAttribute("href", `/courses/${id}`);
			await preview
				.getByRole("button", { name: "Course content", exact: true })
				.click();
			await expect(
				preview.getByRole("dialog").getByText("Course access required"),
			).toBeVisible();
			await preview.keyboard.press("Escape");
			await expect(preview.getByRole("dialog")).toBeHidden();
		} finally {
			await guest.close();
		}
	} finally {
		sql(
			`DELETE FROM rate_limit WHERE key LIKE '%${email}%'; DELETE FROM courses WHERE id='${id}'; DELETE FROM user WHERE id='${id}';`,
		);
	}
});
