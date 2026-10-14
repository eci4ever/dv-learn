import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, type Locator, test } from "@playwright/test";
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
const kinds = ["text-select", "error-spot", "branching-scenario"] as const;

async function exercise(activity: Locator, kind: (typeof kinds)[number]) {
	const check = activity.getByRole("button", {
		name: "Check answer",
		exact: true,
	});
	await check.click();
	await expect(activity.getByRole("status")).toContainText(
		kind === "branching-scenario"
			? "Choose a next step"
			: "Choose an answer first",
	);
	const hint = activity.getByRole("button", { name: "Show hint", exact: true });
	await hint.focus();
	await hint.press("Enter");
	await expect(hint).toHaveAttribute("aria-expanded", "true");
	await expect(activity.locator('[data-slot="accordion-content"]')).toHaveCSS(
		"animation-name",
		"none",
	);
	if (kind === "text-select") {
		const wrong = activity.getByRole("button", {
			name: "https://",
			exact: true,
		});
		await wrong.focus();
		await wrong.press("Space");
		await check.click();
		await expect(activity.getByRole("status")).toContainText("Not quite");
		await wrong.click();
		const right = activity.getByRole("button", {
			name: "learn.example.com",
			exact: true,
		});
		await right.focus();
		await right.press("Enter");
		await expect(right).toHaveAttribute("aria-pressed", "true");
		await check.click();
		await expect(activity.getByRole("status")).toContainText("Correct");
	} else if (kind === "error-spot") {
		await activity.getByRole("radio", { name: /Record type/ }).check();
		await activity
			.getByLabel("Corrected value", { exact: true })
			.fill("app.example.com");
		await check.click();
		await expect(activity.getByRole("status")).toContainText(
			"Check which field",
		);
		await activity.getByRole("radio", { name: /Record value/ }).check();
		const value = activity.getByLabel("Corrected value", { exact: true });
		await value.fill("wrong");
		await check.click();
		await expect(value).toHaveAttribute("aria-invalid", "true");
		await expect(activity.getByRole("status")).toContainText(
			"Check the corrected value",
		);
		await value.fill(" APP.EXAMPLE.COM. ");
		await check.click();
		await expect(activity.getByRole("status")).toContainText("Correct");
	} else {
		await activity
			.getByRole("radio", {
				name: "Immediately change the A record",
				exact: true,
			})
			.check();
		await check.click();
		await expect(activity.getByRole("status")).toContainText("no evidence");
		await activity
			.getByRole("button", { name: "Continue scenario", exact: true })
			.click();
		await expect(
			activity.getByRole("heading", {
				name: "Try another approach",
				exact: true,
			}),
		).toBeFocused();
		await activity
			.getByRole("button", { name: "Previous decision", exact: true })
			.click();
		await activity
			.getByRole("radio", { name: "Inspect the lookup result", exact: true })
			.check();
		await check.click();
		await activity
			.getByRole("button", { name: "Continue scenario", exact: true })
			.click();
		await expect(
			activity.getByRole("heading", {
				name: "Review the evidence",
				exact: true,
			}),
		).toBeFocused();
		await activity
			.getByRole("radio", { name: "Retry using app.example.com", exact: true })
			.check();
		await check.click();
		await activity
			.getByRole("button", { name: "Continue scenario", exact: true })
			.click();
		await expect(activity.getByRole("status")).toContainText(
			"not a verified pass",
		);
	}
	await activity.page().screenshot({
		path: `/tmp/dv-learn-${kind}.png`,
		animations: "disabled",
	});
	await expect
		.poll(() =>
			activity.evaluate((element) => element.contains(document.activeElement)),
		)
		.toBe(true);
	await activity
		.getByRole("button", { name: "Reset practice", exact: true })
		.click();
	if (kind === "text-select")
		await expect(
			activity.getByRole("button", { name: "learn.example.com", exact: true }),
		).toHaveAttribute("aria-pressed", "false");
	if (kind === "error-spot")
		await expect(
			activity.getByLabel("Corrected value", { exact: true }),
		).toHaveValue("");
	if (kind === "branching-scenario")
		await expect(
			activity.getByRole("heading", {
				name: "Website unavailable",
				exact: true,
			}),
		).toBeFocused();
}

test("Studio builds, saves and translates all new activities; learner practice stays local and accessible", async ({
	page,
	context,
	baseURL,
	browser,
}) => {
	test.setTimeout(240_000);
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Opt-in local-only fixtures.",
	);
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw Error("Local-only fixtures.");
	const id = `generic-${randomUUID()}`;
	const email = `${id}@example.test`;
	const fixtureIP = `2001:db8:${randomUUID().replaceAll("-", "").slice(0, 24).match(/.{4}/g)?.join(":")}`;
	const password = "Generic-fixture-only-62!";
	const hash = await hashPassword(password);
	const errors: string[] = [];
	await page.emulateMedia({ reducedMotion: "reduce" });
	page.on("pageerror", (error) => errors.push(error.message));
	try {
		sql(`INSERT INTO user(id,name,email,email_verified,role,created_at,updated_at) VALUES ('${id}','Activity Admin','${email}',1,'admin',0,0);
INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${id}','${id}','credential','${id}','${hash}',0,0);
INSERT INTO courses(id,slug,title,description,published) VALUES ('${id}','${id}','Generic Activity Fixture','Local fixture',1);
INSERT INTO sections(id,course_id,title) VALUES ('${id}','${id}','New activities');
${kinds.map((kind, index) => `INSERT INTO lessons(id,section_id,title,content,lesson_type,published,preview,sort_order) VALUES ('${id}-${kind}','${id}','${kind}','Explain\n\nLocal practice.\n\nRecap\n\nReview your reasoning.','reading',0,0,${index});`).join("\n")}`);
		await context.route("**/*", (route) =>
			["localhost", "127.0.0.1"].includes(
				new URL(route.request().url()).hostname,
			)
				? route.continue()
				: route.abort(),
		);
		await context.setExtraHTTPHeaders({ "cf-connecting-ip": fixtureIP });
		await page.goto("/login");
		await expect(
			page.getByRole("button", { name: "Sign in ↗", exact: true }),
		).toBeEnabled();
		await page.locator('input[name="email"]').fill(email);
		await page.locator('input[name="password"]').fill(password);
		await page.getByRole("button", { name: "Sign in ↗", exact: true }).click();
		await expect(page).toHaveURL(/\/dashboard$/);
		// Course metadata enables the existing course-wide BM content selection.
		await page.goto(`/admin/courses/${id}?tab=translations`);
		await page
			.getByLabel("Translated Title (Bahasa Melayu)", { exact: true })
			.fill("Latihan aktiviti");
		await page
			.getByLabel("Translated Description (Bahasa Melayu)", { exact: true })
			.fill("Fixture tempatan untuk latihan interaktif.");
		await page.getByRole("button", { name: "Save", exact: true }).click();
		await expect(page.getByText("Saved", { exact: true })).toBeVisible();
		for (const kind of kinds) {
			await page.goto(`/admin/courses/${id}/lessons/${id}-${kind}`);
			await page
				.getByLabel("Lesson type", { exact: true })
				.selectOption("interactive");
			await page
				.getByLabel("Interactive activity", { exact: true })
				.selectOption(kind);
			const builder = page.locator('[data-slot="card"]').filter({
				has: page.getByRole("heading", {
					name: "Activity builder",
					exact: true,
				}),
			});
			const title = builder.getByLabel("Activity title", { exact: true });
			await title.fill("");
			await expect(title).toBeVisible(); // Incomplete typing must not discard the builder.
			await title.fill(`Activity ${kind}`);
			const configuration = page.getByLabel(
				"Activity configuration (version 1 JSON)",
				{ exact: true },
			);
			const originalJson = await configuration.inputValue();
			const invalidJson = JSON.stringify({
				...JSON.parse(originalJson),
				version: 2,
			});
			await configuration.fill(invalidJson);
			await expect(title).toHaveCount(0);
			await expect(configuration).toHaveValue(invalidJson);
			await configuration.fill(originalJson);
			await expect(title).toHaveValue(`Activity ${kind}`);
			if (kind === "branching-scenario") {
				await builder
					.getByRole("button", { name: "Add outcome stage", exact: true })
					.click();
				await page.getByRole("button", { name: "Save", exact: true }).click();
				await expect(
					page.getByText(
						"Check the highlighted fields. Your changes have been kept.",
						{ exact: true },
					),
				).toBeVisible();
				await builder
					.getByRole("group", { name: "outcome1", exact: true })
					.getByRole("button", { name: "Remove", exact: true })
					.click();
			} else {
				await builder
					.getByRole("button", { name: "Add task", exact: true })
					.click();
				const second = builder.getByRole("group", { name: /^Task 2 of 2/ });
				await second
					.getByRole("button", { name: "Remove", exact: true })
					.last()
					.click();
				const prompt = builder.getByLabel("Task prompt", { exact: true });
				const before = await prompt.inputValue();
				await prompt.fill(`${before} `);
				await prompt.press("End");
				await prompt.pressSequentially("Try it.");
				await expect(prompt).toHaveValue(`${before} Try it.`); // Don't trim spaces on every keystroke.
			}
			await page.setViewportSize({ width: 375, height: 812 });
			await page
				.getByRole("button", { name: "Preview lesson", exact: true })
				.click();
			const dialog = page.getByRole("dialog");
			await exercise(dialog.getByTestId("lesson-activity"), kind);
			await expect
				.poll(() => dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1))
				.toBe(true);
			await page.keyboard.press("Escape");
			await page.getByLabel("Free preview", { exact: true }).check();
			await page.getByLabel("Published", { exact: true }).check();
			await page.getByRole("button", { name: "Save", exact: true }).click();
			await expect(page.getByText("Saved", { exact: true })).toBeVisible();
			await page.reload();
			await expect(
				page.getByLabel("Interactive activity", { exact: true }),
			).toHaveValue(kind);
			await expect(
				page.getByLabel("Activity title", { exact: true }),
			).toHaveValue(`Activity ${kind}`);
			await page.goto(`/admin/courses/${id}?tab=translations`);
			await page
				.getByLabel("Content to translate", { exact: true })
				.selectOption("lesson");
			await page.getByRole("button", { name: new RegExp(`^${kind} `) }).click();
			await page
				.getByLabel("Translated Title (Bahasa Melayu)", { exact: true })
				.fill(`Latihan ${kind}`);
			await page
				.getByLabel("Translated title (Bahasa Melayu)", { exact: true })
				.fill(`Aktiviti ${kind}`);
			const promptPath =
				kind === "branching-scenario"
					? "nodes › 0 › text"
					: "tasks › 0 › prompt";
			await page
				.getByLabel(`Translated ${promptPath} (Bahasa Melayu)`, { exact: true })
				.fill("Cuba latihan ini berdasarkan maklumat yang diberikan.");
			await page.getByRole("button", { name: "Save", exact: true }).click();
			await expect(page.getByText("Saved", { exact: true })).toBeVisible();
			await page.goto(`/learn/${id}/${id}-${kind}`);
			await exercise(page.getByTestId("lesson-activity"), kind);
			await selectLanguage(page, "ms");
			await expect(
				page.getByRole("heading", { name: `Aktiviti ${kind}`, exact: true }),
			).toBeVisible();
			await expect(
				page.getByText(
					"Cuba latihan ini berdasarkan maklumat yang diberikan.",
					{ exact: true },
				),
			).toBeVisible();
			await selectLanguage(page, "en");
			for (const width of [320, 375, 768, 1280])
				for (const theme of ["light", "dark"]) {
					await page.setViewportSize({ width, height: 900 });
					await page.evaluate((value) => {
						document.documentElement.dataset.theme = value;
					}, theme);
					expect(
						await page.evaluate(
							() => document.documentElement.scrollWidth <= innerWidth + 1,
						),
					).toBe(true);
				}
			await page.reload();
			if (kind === "text-select")
				await expect(
					page.getByRole("button", { name: "learn.example.com", exact: true }),
				).toHaveAttribute("aria-pressed", "false");
			if (kind === "error-spot")
				await expect(
					page.getByLabel("Corrected value", { exact: true }),
				).toHaveValue("");
			if (kind === "branching-scenario")
				await expect(
					page.getByRole("heading", {
						name: "Website unavailable",
						exact: true,
					}),
				).toBeVisible();
		}
		const guest = await browser.newContext({
			baseURL,
			viewport: { width: 320, height: 812 },
		});
		try {
			const visitor = await guest.newPage();
			await visitor.goto(`/learn/${id}/${id}-text-select`);
			await expect(
				visitor.getByRole("button", { name: "Mark as complete", exact: true }),
			).toBeDisabled();
			await visitor
				.getByRole("button", { name: "learn.example.com", exact: true })
				.click();
			await visitor
				.getByRole("button", { name: "Check answer", exact: true })
				.click();
			await expect(
				visitor.getByTestId("lesson-activity").getByRole("status"),
			).toContainText("Correct");
		} finally {
			await guest.close();
		}
		expect(errors).toEqual([]);
	} finally {
		sql(
			`DELETE FROM audit_log WHERE actor_id='${id}'; DELETE FROM courses WHERE id='${id}'; DELETE FROM user WHERE id='${id}'; DELETE FROM rate_limit WHERE instr(key,'${email}')>0 OR instr(key,'${fixtureIP}')>0;`,
		);
	}
});
