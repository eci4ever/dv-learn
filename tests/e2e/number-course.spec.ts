import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
	course,
	lessons,
} from "../../courses/computer-number-systems/bundle.ts";
import { parseActivity } from "../../src/lib/lesson-activity.ts";
import { hashPassword } from "../../src/server/password";

test("number course public previews, all answers, retry, keyboard and reflow", async ({
	page,
}) => {
	test.skip(
		process.env.PLAYWRIGHT_NUMBERS_COURSE !== "1",
		"Requires explicitly seeded course target; read-only public smoke.",
	);
	test.setTimeout(180_000);
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto(`/courses/${course.slug}`);
	await expect(
		page.getByRole("heading", { name: course.title, exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Start course — Free", exact: true }),
	).toBeVisible();
	for (const lesson of lessons) {
		await page.goto(`/learn/${course.slug}/${lesson.id}`);
		await expect(
			page.getByRole("heading", { name: lesson.title, exact: true, level: 1 }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Mark as complete", exact: true }),
		).toBeDisabled();
		const activity = page.getByTestId("lesson-activity");
		const check = activity.getByRole("button", {
			name: "Check answer",
			exact: true,
		});
		const config = parseActivity(lesson.activityConfig);
		if (!config) throw Error("Missing configured practice");
		if (config.kind === "practice-quiz") {
			await expect(check).toBeDisabled();
			for (const [index, q] of config.questions.entries()) {
				if (index === 0) {
					await activity
						.getByRole("radio", {
							name: q.choices.find((c) => c.id !== q.answerId)?.text,
							exact: true,
						})
						.check();
					await check.click();
					await expect(
						activity.getByRole("status").filter({ hasText: "Not quite" }),
					).toBeVisible();
				}
				const choice = q.choices.find((c) => c.id === q.answerId);
				if (!choice) throw Error("Missing answer");
				await activity
					.getByRole("radio", { name: choice.text, exact: true })
					.check();
				await check.click();
				await expect(
					activity.getByRole("status").filter({ hasText: "Correct" }),
				).toBeVisible();
				if (index < config.questions.length - 1)
					await activity
						.getByRole("button", { name: "Next question", exact: true })
						.click();
			}
			await expect(
				activity.getByRole("status").filter({
					hasText: `${config.questions.length} out of ${config.questions.length}`,
				}),
			).toBeVisible();
			await activity
				.getByRole("button", { name: "Reset quiz", exact: true })
				.click();
			await expect(activity.getByRole("radio", { checked: true })).toHaveCount(
				0,
			);
			await activity.getByRole("radio").first().focus();
			await page.keyboard.press("Space");
			await expect(activity.getByRole("radio", { checked: true })).toHaveCount(
				1,
			);
		} else if (config.kind === "error-spot" || config.kind === "text-select") {
			await check.click();
			await expect(activity.getByRole("status")).toContainText(
				"Choose an answer first",
			);
			const hint = activity.getByRole("button", {
				name: "Show hint",
				exact: true,
			});
			await hint.focus();
			await page.keyboard.press("Enter");
			await expect(hint).toHaveAttribute("aria-expanded", "true");
			for (const [index, task] of config.tasks.entries()) {
				if (config.kind === "error-spot") {
					const error = config.tasks[index];
					const field = error.fields.find((f) => f.id === error.errorFieldId);
					if (!field) throw Error("Missing error field");
					await activity
						.getByRole("radio", {
							name: `${field.label} ${field.value}`,
							exact: true,
						})
						.check();
					const input = activity.getByLabel("Corrected value", { exact: true });
					await input.fill("wrong");
					await check.click();
					await expect(activity.getByRole("status")).toContainText("Not quite");
					await input.fill(` ${error.acceptedValues[0].toLowerCase()} `);
				} else {
					const selection = config.tasks[index];
					if (index === 0) {
						const wrong = selection.segments.find(
							(s) => !selection.answerIds.includes(s.id),
						);
						if (!wrong) throw Error("Expected wrong tile");
						await activity
							.getByRole("button", { name: wrong.text, exact: true })
							.click();
						await check.click();
						await expect(activity.getByRole("status")).toContainText(
							"Not quite",
						);
						await activity
							.getByRole("button", { name: new RegExp(`${wrong.text}$`) })
							.click();
					}
					for (const id of selection.answerIds) {
						const tile = selection.segments.find((s) => s.id === id);
						if (!tile) throw Error("Missing tile");
						const button = activity.getByRole("button", {
							name: new RegExp(`^(?:✓\\s*)?${tile.text}$`),
							exact: true,
						});
						await button.focus();
						await page.keyboard.press("Space");
						await expect(button).toHaveAttribute("aria-pressed", "true");
					}
				}
				await check.click();
				await expect(activity.getByRole("status")).toContainText("Correct");
				await expect(activity.getByRole("status")).toContainText(
					task.explanation,
				);
				if (index < config.tasks.length - 1)
					await activity
						.getByRole("button", { name: "Next task", exact: true })
						.click();
			}
			if (config.kind === "text-select")
				await page.screenshot({
					path:
						new URL(page.url()).hostname === "learn.nimfi.dev"
							? "/tmp/dv-learn-number-course-production.png"
							: "/tmp/dv-learn-number-course-local.png",
					fullPage: false,
					animations: "disabled",
				});
			await activity
				.getByRole("button", { name: "Reset practice", exact: true })
				.click();
			if (config.kind === "error-spot")
				await expect(
					activity.getByLabel("Corrected value", { exact: true }),
				).toHaveValue("");
			else
				await expect(
					activity.locator('button[aria-pressed="true"]'),
				).toHaveCount(0);
		}
		await page.reload();
		await expect(
			page.getByRole("heading", { name: lesson.title, exact: true, level: 1 }),
		).toBeVisible();
		await expect(activity.getByRole("radio", { checked: true })).toHaveCount(0);
		await expect(activity.locator('button[aria-pressed="true"]')).toHaveCount(
			0,
		);
		for (const width of [320, 375, 768, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ["light", "dark"]) {
				await page.evaluate((value) => {
					document.documentElement.dataset.theme = value;
					document.documentElement.classList.toggle("dark", value === "dark");
				}, theme);
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth <= window.innerWidth,
					),
				).toBe(true);
			}
		}
		expect(
			await activity.evaluate((element) => {
				const recap = document.querySelector('[aria-label="Lesson recap"]');
				return Boolean(
					recap &&
						element.compareDocumentPosition(recap) &
							Node.DOCUMENT_POSITION_FOLLOWING,
				);
			}),
		).toBe(true);
	}
	expect(errors).toEqual([]);
});

test("number course verified free enrollment and durable completion", async ({
	page,
	context,
	baseURL,
}) => {
	test.skip(
		process.env.PLAYWRIGHT_NUMBERS_COURSE !== "1" ||
			process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Opt-in local student fixture only.",
	);
	test.setTimeout(90_000);
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw Error("Student fixtures are local-only");
	const id = `numbers-${randomUUID()}`;
	const email = `${id}@example.test`;
	const ip = `2001:db8:${randomUUID().replaceAll("-", "").slice(0, 24).match(/.{4}/g)?.join(":")}`;
	const password = "Numbers-local-fixture-only-43!";
	const hash = await hashPassword(password);
	const sql = (command: string) =>
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
				"--json",
			],
			{ encoding: "utf8", stdio: "pipe" },
		);
	try {
		sql(
			`INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('${id}','Number Student','${email}',1,0,0); INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${id}','${id}','credential','${id}','${hash}',0,0);`,
		);
		await context.route("**/*", (route) =>
			["localhost", "127.0.0.1"].includes(
				new URL(route.request().url()).hostname,
			)
				? route.continue()
				: route.abort(),
		);
		await context.setExtraHTTPHeaders({ "cf-connecting-ip": ip });
		await page.goto(`/learn/${course.slug}/${lessons[0].id}`);
		await page
			.getByRole("link", { name: "Sign in to save progress", exact: true })
			.click();
		await page.locator('input[name="email"]').fill(email);
		await page.locator('input[name="password"]').fill(password);
		await page.getByRole("button", { name: "Sign in ↗", exact: true }).click();
		await expect(page).toHaveURL(
			new RegExp(`/learn/${course.slug}/${lessons[0].id}$`),
		);
		await expect(
			page.getByRole("button", { name: "Mark as complete", exact: true }),
		).toBeDisabled();
		await page
			.getByRole("button", { name: "Enroll free", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Mark as complete", exact: true })
			.click();
		await page.reload();
		await expect(
			page.getByRole("button", { name: "✓ Complete", exact: true }),
		).toBeDisabled();
		const result = JSON.parse(
			sql(
				`SELECT (SELECT count(*) FROM free_enrollments WHERE user_id='${id}' AND course_id='${course.id}') AS enrollments,(SELECT count(*) FROM orders WHERE user_id='${id}') AS orders;`,
			),
		)[0].results[0];
		expect(result).toEqual({ enrollments: 1, orders: 0 });
	} finally {
		sql(
			`DELETE FROM rate_limit WHERE instr(key,'${email}')>0 OR instr(key,'${ip}')>0; DELETE FROM user WHERE id='${id}';`,
		);
	}
});
