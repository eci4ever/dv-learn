import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { hashPassword } from "../../src/server/password";

const prefix = `authoring-${Date.now()}`;
const email = `${prefix}@example.test`;
const password = "Local-authoring-fixture-57!";
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
test("admin configures an activity, previews unsaved drafts and reviews publishing", async ({
	page,
	context,
	baseURL,
	browser,
}) => {
	test.setTimeout(90_000);
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Opt-in local D1 fixture; no email or payment providers.",
	);
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw new Error("Authoring fixtures are local-only.");
	const hash = await hashPassword(password);
	sql(`INSERT INTO user(id,name,email,email_verified,role,created_at,updated_at) VALUES ('${prefix}','Authoring Admin','${email}',1,'admin',0,0);
INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${prefix}','${prefix}','credential','${prefix}','${hash}',0,0);
INSERT INTO courses(id,slug,title,description,published) VALUES ('${prefix}','${prefix}','Authoring Fixture','A local draft course',0);
INSERT INTO sections(id,course_id,title) VALUES ('${prefix}','${prefix}','Practice section');
INSERT INTO lessons(id,section_id,title,content,published,preview) VALUES ('${prefix}','${prefix}','Draft practice','Draft notes',0,0);`);
	try {
		await context.route("**/*", (route) =>
			["localhost", "127.0.0.1"].includes(
				new URL(route.request().url()).hostname,
			)
				? route.continue()
				: route.abort(),
		);
		await context.setExtraHTTPHeaders({ "cf-connecting-ip": "192.0.2.123" });
		await page.goto("/login");
		await page.locator('input[name="email"]').fill(email);
		await page.locator('input[name="password"]').fill(password);
		await page.getByRole("button", { name: "Sign in ↗" }).click();
		await expect(page).toHaveURL(/\/dashboard$/);
		await page.goto(`/admin/courses/${prefix}/lessons/${prefix}`);
		await page
			.getByLabel("Lesson type", { exact: true })
			.selectOption("interactive");
		await page
			.getByLabel("Interactive activity", { exact: true })
			.selectOption("subnet");
		await expect(page.getByLabel("YouTube video URL")).toHaveCount(0);
		await page.getByRole("button", { name: "Preview lesson" }).click();
		const dialog = page.getByRole("dialog");
		await expect(dialog.getByText("Draft notes")).toBeVisible();
		await expect(dialog.locator(".ip-lab")).toBeVisible();
		await dialog.locator("select").selectOption("26");
		await expect(
			dialog.getByText("192.168.1.128", { exact: true }),
		).toBeVisible();
		await page.setViewportSize({ width: 375, height: 812 });
		expect(
			await dialog.evaluate(
				(element) => element.scrollWidth <= element.clientWidth,
			),
		).toBe(true);
		await page.keyboard.press("Escape");
		await page.getByRole("button", { name: "Save", exact: true }).click();
		await expect(page.getByText("Saved", { exact: true })).toBeVisible();
		await page.reload();
		await expect(page.getByLabel("Lesson type", { exact: true })).toHaveValue(
			"interactive",
		);
		await expect(
			page.getByLabel("Interactive activity", { exact: true }),
		).toHaveValue("subnet");
		await page
			.getByLabel("Interactive activity", { exact: true })
			.selectOption("dns-cache");
		const configuration = page.getByLabel(
			"Activity configuration (version 1 JSON)",
		);
		const payload = await configuration.inputValue();
		await configuration.fill("{");
		await page.getByRole("button", { name: "Save", exact: true }).click();
		await expect(
			page.getByText(
				"Check the highlighted fields. Your changes have been kept.",
			),
		).toBeVisible();
		await configuration.fill(payload);
		await page.getByRole("button", { name: "Preview lesson" }).click();
		await expect(dialog.getByLabel("Predicted IPv4 answer")).toBeVisible();
		await dialog.getByLabel("Predicted IPv4 answer").fill("192.0.2.10");
		await dialog
			.getByLabel("Remaining TTL after the query (seconds)")
			.fill("180");
		await dialog.getByRole("button", { name: "Check prediction" }).click();
		await expect(
			dialog.getByRole("status").filter({ hasText: "Correct." }),
		).toBeVisible();
		await page.keyboard.press("Escape");
		await page.getByRole("button", { name: "Save", exact: true }).click();
		await expect(page.getByText("Saved", { exact: true })).toBeVisible();
		await page.reload();
		await expect(
			page.getByLabel("Interactive activity", { exact: true }),
		).toHaveValue("dns-cache");
		await expect(configuration).toHaveValue(payload);
		const bundle = JSON.parse(
			readFileSync(
				new URL("../../courses/dns-fundamentals/course.json", import.meta.url),
				"utf8",
			),
		);
		for (const lesson of bundle.lessons) {
			await page
				.getByLabel("Lesson type", { exact: true })
				.selectOption(lesson.lessonType);
			await page.getByLabel("Lesson title", { exact: true }).fill(lesson.title);
			await page
				.getByLabel("Description", { exact: true })
				.fill(lesson.description);
			await page
				.getByLabel(
					lesson.lessonType === "reading" ? "Reading content" : "Lesson notes",
					{ exact: true },
				)
				.fill(lesson.content);
			if (lesson.config) {
				await page
					.getByLabel(
						lesson.lessonType === "quiz"
							? "Quiz activity"
							: "Interactive activity",
						{ exact: true },
					)
					.selectOption(lesson.config.kind);
				await configuration.fill(JSON.stringify(lesson.config));
			}
			await page.getByRole("button", { name: "Preview lesson" }).click();
			await expect(
				dialog.getByRole("heading", { name: lesson.title, exact: true }),
			).toBeVisible();
			await expect(
				dialog.getByRole("heading", { name: "Recap", exact: true }),
			).toBeVisible();
			if (lesson.lessonType === "reading") {
				const reveal = dialog.getByRole("button", {
					name: "Reveal self-check answers",
				});
				await expect(reveal).toHaveAttribute("aria-expanded", "false");
				await reveal.focus();
				await page.keyboard.press("Enter");
				await expect(reveal).toHaveAttribute("aria-expanded", "true");
			}
			await page.keyboard.press("Escape");
		}
		await page
			.getByRole("button", { name: "Discard changes", exact: true })
			.click();
		await page.goto(`/admin/courses/${prefix}`);
		await expect(page.getByText("Publish at least one lesson.")).toBeVisible();
		const anonymous = await browser.newContext();
		try {
			const visitor = await anonymous.newPage();
			await visitor.goto(`${baseURL}/learn/${prefix}/${prefix}`);
			await expect(
				visitor.getByText("Course not found.", { exact: false }),
			).toBeVisible();
			await expect(
				visitor.getByText("Draft notes", { exact: true }),
			).toHaveCount(0);
		} finally {
			await anonymous.close();
		}
	} finally {
		sql(
			`DELETE FROM audit_log WHERE actor_id='${prefix}'; DELETE FROM courses WHERE id='${prefix}'; DELETE FROM user WHERE id='${prefix}';`,
		);
	}
});
