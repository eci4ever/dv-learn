import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { hashPassword } from "../../src/server/password";

const bundle = JSON.parse(
	readFileSync(
		new URL("../../courses/dns-fundamentals/course.ms.json", import.meta.url),
		"utf8",
	),
);
test("BM course copy, English terms and interactive practice switch on unchanged URLs", async ({
	page,
}, testInfo) => {
	test.setTimeout(90_000);
	await page.goto("/courses/dns-fundamentals");
	await page
		.getByRole("combobox", { name: "Language", exact: true })
		.selectOption("ms");
	await expect(
		page.getByRole("combobox", { name: "Bahasa", exact: true }),
	).toBeEnabled();
	await expect(
		page.getByRole("heading", { name: "Asas DNS", exact: true }),
	).toBeVisible();
	await expect(page).toHaveURL(/\/courses\/dns-fundamentals$/);
	for (const lesson of bundle.lessons) {
		await page.goto(`/learn/dns-fundamentals/${lesson.id}`);
		await expect(
			page.getByRole("heading", { name: lesson.title, exact: true }),
		).toBeVisible();
		await expect(
			page.getByText(/Bahasa kandungan: Bahasa Melayu/),
		).toBeVisible();
		await expect(
			page.getByRole("button", {
				name: "Tandakan sebagai selesai",
				exact: true,
			}),
		).toBeDisabled();
		if (lesson.lessonType === "reading") {
			const reveal = page.getByRole("button", {
				name: "Paparkan jawapan self-check",
				exact: true,
			});
			await expect(reveal).toHaveAttribute("aria-expanded", "false");
			await reveal.focus();
			await page.keyboard.press("Enter");
			await expect(reveal).toHaveAttribute("aria-expanded", "true");
		} else if (lesson.config.kind === "dns-records") {
			const task = lesson.config.tasks[0];
			await page.getByLabel("Owner name", { exact: true }).fill(task.owner);
			await page
				.getByLabel("Record type", { exact: true })
				.selectOption(task.expected.type);
			await page.getByLabel("Record value", { exact: true }).fill("wrong");
			await page
				.getByRole("button", { name: "Semak jawapan", exact: true })
				.click();
			await expect(
				page.getByRole("status").filter({ hasText: "Semak value:" }),
			).toBeVisible();
			await page
				.getByLabel("Record value", { exact: true })
				.fill(task.expected.value);
			await page
				.getByRole("button", { name: "Semak jawapan", exact: true })
				.click();
			await expect(
				page.getByRole("status").filter({ hasText: "Betul." }),
			).toBeVisible();
		} else if (lesson.config.kind === "dns-resolution") {
			await page
				.getByLabel("Siapakah yang menerima mesej seterusnya?", { exact: true })
				.selectOption(lesson.config.coldSteps[0].to);
			await page
				.getByLabel("Apakah hasil langkah ini?", { exact: true })
				.selectOption(lesson.config.coldSteps[0].result);
			await page
				.getByRole("button", { name: "Semak langkah", exact: true })
				.click();
			await expect(
				page.getByRole("status").filter({ hasText: "Betul." }),
			).toBeVisible();
		} else if (lesson.config.kind === "dns-cache") {
			await page
				.getByLabel("Ramalan IPv4 answer", { exact: true })
				.fill("192.0.2.10");
			await page
				.getByLabel("Baki TTL selepas query (saat)", { exact: true })
				.fill("180");
			await page
				.getByRole("button", { name: "Semak ramalan", exact: true })
				.click();
			await expect(
				page.getByRole("status").filter({ hasText: "Betul." }),
			).toBeVisible();
		} else {
			const question = lesson.config.questions[0];
			await page
				.getByRole("radio", {
					name: question.choices.find(
						(choice: { id: string }) => choice.id !== question.answerId,
					).text,
					exact: true,
				})
				.check();
			await page
				.getByRole("button", { name: "Semak jawapan", exact: true })
				.click();
			await expect(
				page.getByRole("link", { name: /Ulang kaji pelajaran:/ }),
			).toHaveAttribute("href", `/learn/dns-fundamentals/${question.lessonId}`);
		}
		for (const width of [320, 375, 768, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ["light", "dark"]) {
				await page.evaluate(
					(theme) => (document.documentElement.dataset.theme = theme),
					theme,
				);
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth <= innerWidth + 1,
					),
				).toBe(true);
			}
		}
	}
	await page
		.getByRole("button", { name: "Terangkan TTL", exact: true })
		.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toHaveAttribute("lang", "ms");
	await expect(
		dialog.getByRole("heading", { name: "TTL", exact: true }),
	).toBeVisible();
	await expect(dialog.getByText(/Time to live: tempoh/)).toBeVisible();
	await page.setViewportSize({ width: 375, height: 812 });
	await page.screenshot({
		path: testInfo.outputPath("bm-glossary-mobile.png"),
		fullPage: true,
	});
	await page.keyboard.press("Escape");
	const url = page.url();
	await page
		.getByRole("combobox", { name: "Bahasa", exact: true })
		.selectOption("en");
	await expect(
		page.getByRole("combobox", { name: "Language", exact: true }),
	).toBeEnabled();
	await expect(page).toHaveURL(url);
	await expect(
		page.getByRole("heading", {
			name: "Check your understanding",
			exact: true,
		}),
	).toBeVisible();
	await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
});

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
test("saved DNS completion survives BM/EN and remains one course", async ({
	page,
	context,
	baseURL,
}) => {
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Local-only verified fixture",
	);
	test.setTimeout(90_000);
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw Error("Fixtures are local-only");
	const id = `bm-progress-${Date.now()}`,
		email = `${id}@example.test`,
		password = "BM-progress-fixture-only-57!",
		hash = await hashPassword(password);
	sql(
		`INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('${id}','BM Student','${email}',1,0,0); INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${id}','${id}','credential','${id}','${hash}',0,0);`,
	);
	try {
		await context.route("**/*", (route) =>
			["localhost", "127.0.0.1"].includes(
				new URL(route.request().url()).hostname,
			)
				? route.continue()
				: route.abort(),
		);
		await context.setExtraHTTPHeaders({ "cf-connecting-ip": "192.0.2.184" });
		await page.goto(
			"/login?returnTo=%2Flearn%2Fdns-fundamentals%2Fdns-names-url",
		);
		await page.locator('[name="email"]').fill(email);
		await page.locator('[name="password"]').fill(password);
		await page.getByRole("button", { name: "Sign in ↗", exact: true }).click();
		await expect(page).toHaveURL(/\/learn\/dns-fundamentals\/dns-names-url$/);
		await page
			.getByRole("button", { name: "Enroll free", exact: true })
			.click();
		await page
			.getByRole("button", { name: "Mark as complete", exact: true })
			.click();
		await expect(
			page.getByRole("button", { name: "✓ Complete", exact: true }),
		).toBeDisabled();
		await page
			.getByRole("combobox", { name: "Language", exact: true })
			.selectOption("ms");
		await expect(
			page.getByRole("combobox", { name: "Bahasa", exact: true }),
		).toBeEnabled();
		await expect(
			page.getByRole("button", { name: "✓ Selesai", exact: true }),
		).toBeDisabled();
		await expect(
			page.getByRole("heading", {
				name: "Cari hostname dalam URL",
				exact: true,
			}),
		).toBeVisible();
		await page.goto("/dashboard");
		await expect(
			page.getByRole("link", { name: "Resume lesson", exact: true }),
		).toHaveAttribute("href", "/learn/dns-fundamentals/dns-lookup");
		await expect(
			page.getByText("Up next: Ikuti DNS lookup", { exact: true }),
		).toBeVisible();
		await page
			.getByRole("combobox", { name: "Bahasa", exact: true })
			.selectOption("en");
		await expect(
			page.getByRole("combobox", { name: "Language", exact: true }),
		).toBeEnabled();
		await page.goto("/learn/dns-fundamentals/dns-names-url");
		await expect(
			page.getByRole("button", { name: "✓ Complete", exact: true }),
		).toBeDisabled();
	} finally {
		sql(
			`DELETE FROM rate_limit WHERE key LIKE '%${email}%'; DELETE FROM user WHERE id='${id}';`,
		);
	}
});
