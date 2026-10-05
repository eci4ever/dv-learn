import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const bundle = JSON.parse(
	readFileSync(
		new URL("../../courses/dns-fundamentals/course.json", import.meta.url),
		"utf8",
	),
);

test("DNS public previews: lookup, records, cache, quiz, retry and reflow", async ({
	page,
}) => {
	test.setTimeout(120_000);
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(e.message));
	for (const lesson of bundle.lessons) {
		await page.goto(`/learn/dns-fundamentals/${lesson.id}`);
		await expect(
			page.getByRole("heading", { name: lesson.title, exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Mark as complete", exact: true }),
		).toBeDisabled();
		const config = lesson.config;
		const resources = page.getByRole("complementary", {
			name: "Learning resources",
		});
		expect(
			await resources
				.getByRole("link")
				.evaluateAll((links) =>
					links.every(
						(link) =>
							!["absolute", "fixed"].includes(getComputedStyle(link).position),
					),
				),
		).toBe(true);
		expect(
			await resources.evaluate((element) => {
				const recap = document.querySelector('[aria-label="Lesson recap"]');
				return Boolean(
					recap &&
						element.getBoundingClientRect().top >=
							recap.getBoundingClientRect().bottom,
				);
			}),
		).toBe(true);
		if (!config) {
			const reveal = page.getByRole("button", {
				name: "Reveal self-check answers",
			});
			await expect(reveal).toHaveAttribute("aria-expanded", "false");
			await reveal.focus();
			await page.keyboard.press("Enter");
			await expect(reveal).toHaveAttribute("aria-expanded", "true");
			await expect(
				page.locator('[data-slot="accordion-content"]'),
			).toBeVisible();
			await page.keyboard.press("Enter");
			await expect(reveal).toHaveAttribute("aria-expanded", "false");
		} else {
			const recap = page.getByRole("article", { name: "Lesson recap" });
			expect(
				await page.getByTestId("lesson-activity").evaluate((element) => {
					const recapElement = document.querySelector(
						'[aria-label="Lesson recap"]',
					);
					return Boolean(
						recapElement &&
							element.compareDocumentPosition(recapElement) &
								Node.DOCUMENT_POSITION_FOLLOWING,
					);
				}),
			).toBe(true);
			await expect(recap).toBeVisible();
		}
		if (config?.kind === "dns-resolution") {
			await expect(
				page.getByRole("button", { name: "Check step", exact: true }),
			).toBeDisabled();
			await page
				.getByLabel("Who receives the next message?")
				.selectOption(config.coldSteps[0].from);
			await page
				.getByLabel("What is the result of this step?")
				.selectOption("answer");
			await page
				.getByRole("button", { name: "Check step", exact: true })
				.click();
			await expect(
				page.getByRole("status").filter({ hasText: "Not quite." }),
			).toBeVisible();
			for (const mode of ["cold", "warm"]) {
				await page.getByLabel("Cache mode").selectOption(mode);
				await page.getByRole("button", { name: "Reset lookup" }).click();
				const steps = mode === "cold" ? config.coldSteps : config.warmSteps;
				for (let i = 0; i < steps.length; i++) {
					await page
						.getByLabel("Who receives the next message?")
						.selectOption(steps[i].to);
					await page
						.getByLabel("What is the result of this step?")
						.selectOption(steps[i].result);
					await page
						.getByRole("button", { name: "Check step", exact: true })
						.click();
					await expect(
						page.getByRole("status").filter({ hasText: "Correct." }),
					).toBeVisible();
					if (i < steps.length - 1)
						await page.getByRole("button", { name: "Next step" }).click();
				}
			}
			await page.getByRole("button", { name: "Reset lookup" }).click();
			await expect(
				page.getByLabel("Who receives the next message?"),
			).toHaveValue("");
		} else if (config?.kind === "dns-records") {
			await expect(
				page.getByRole("button", { name: "Check records" }),
			).toBeDisabled();
			for (let i = 0; i < config.tasks.length; i++) {
				const task = config.tasks[i];
				await page
					.getByLabel("Owner name", { exact: true })
					.nth(i)
					.fill(task.owner);
				await page
					.getByLabel("Record type", { exact: true })
					.nth(i)
					.selectOption(task.expected.type);
				await page
					.getByLabel("Record value", { exact: true })
					.nth(i)
					.fill(task.expected.value);
				if (task.expected.type === "MX")
					await page
						.getByLabel("Mail preference")
						.fill(String(task.expected.preference));
			}
			await page
				.getByLabel("Record value", { exact: true })
				.first()
				.fill("wrong");
			await page.getByRole("button", { name: "Check records" }).click();
			await expect(
				page
					.getByRole("status")
					.filter({ hasText: "Check the supplied value" }),
			).toBeVisible();
			await page
				.getByLabel("Record value", { exact: true })
				.first()
				.fill(config.tasks[0].expected.value);
			await page.getByRole("button", { name: "Check records" }).click();
			await expect(
				page.getByRole("status").filter({ hasText: "6 of 6" }),
			).toBeVisible();
			await page.getByRole("button", { name: "Reset records" }).click();
			await expect(
				page.getByLabel("Owner name", { exact: true }).first(),
			).toHaveValue("");
		} else if (config?.kind === "dns-cache") {
			await page.getByLabel("Predicted IPv4 answer").fill("192.0.2.20");
			await page
				.getByLabel("Remaining TTL after the query (seconds)")
				.fill("300");
			await page.getByRole("button", { name: "Check prediction" }).click();
			await expect(
				page.getByRole("status").filter({ hasText: "Not quite." }),
			).toBeVisible();
			const answers = [
				["192.0.2.10", 180],
				["192.0.2.10", 1],
				["192.0.2.20", 300],
				["192.0.2.20", 299],
			];
			for (let i = 0; i < answers.length; i++) {
				await page
					.getByLabel("Predicted IPv4 answer")
					.fill(String(answers[i][0]));
				await page
					.getByLabel("Remaining TTL after the query (seconds)")
					.fill(String(answers[i][1]));
				await page.getByRole("button", { name: "Check prediction" }).click();
				await expect(
					page.getByRole("status").filter({ hasText: "Correct." }),
				).toBeVisible();
				if (i < answers.length - 1)
					await page.getByRole("button", { name: "Next query" }).click();
			}
			await page.getByRole("button", { name: "Reset timeline" }).click();
			await expect(page.getByText("Query 1 of 4: t=120 seconds")).toBeVisible();
		} else if (config?.kind === "practice-quiz") {
			await expect(
				page.getByRole("button", { name: "Check answers" }),
			).toBeDisabled();
			for (let i = 0; i < config.questions.length; i++) {
				const q = config.questions[i];
				await page
					.getByRole("radiogroup")
					.nth(i)
					.getByRole("radio", {
						name: q.choices.find((c: { id: string }) => c.id === q.answerId)
							.text,
						exact: true,
					})
					.check();
			}
			await page.getByRole("button", { name: "Check answers" }).click();
			await expect(
				page.getByRole("status").filter({ hasText: "8 out of 8" }),
			).toBeVisible();
			await page.getByRole("button", { name: "Reset quiz" }).click();
			await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
			await page.getByRole("radio").first().focus();
			await page.keyboard.press("Space");
			await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
			await page.reload();
			await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
		}
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
				expect(
					await page
						.locator("fieldset")
						.evaluateAll((elements) =>
							elements.every(
								(element) => element.scrollWidth <= element.clientWidth + 1,
							),
						),
				).toBe(true);
			}
		}
	}
	expect(errors).toEqual([]);
});
