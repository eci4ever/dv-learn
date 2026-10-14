import { expect, test } from "@playwright/test";
import { selectLanguage } from "./helpers/select-language";

test("lesson surfaces and grouped practice stay readable in EN/BM, both themes and narrow layouts", async ({
	page,
}) => {
	test.setTimeout(90_000);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/learn/dns-fundamentals/dns-names-url");
	await expect(
		page.getByRole("button", { name: "Dark theme", exact: true }),
	).toBeEnabled();
	for (const language of ["en", "ms"] as const) {
		await selectLanguage(page, language);
		for (const width of [320, 375, 768, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ["light", "dark"]) {
				await page.evaluate((value) => {
					document.documentElement.dataset.theme = value;
				}, theme);
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth <= innerWidth + 1,
					),
				).toBe(true);
				const reading = page.locator('[data-reading-kind="explain"]').first();
				const example = page.locator('[data-reading-kind="example"]');
				const practice = page.locator('[data-reading-kind="practice"]');
				expect(
					await reading.evaluate((e) => getComputedStyle(e).backgroundColor),
				).not.toEqual(
					await example.evaluate((e) => getComputedStyle(e).backgroundColor),
				);
				expect(
					await practice.evaluate(
						(e) => getComputedStyle(e).borderInlineStartWidth,
					),
				).toBe("4px");
				await expect(
					page.getByRole("button", {
						name:
							language === "en"
								? "Mark as complete"
								: "Tandakan sebagai selesai",
						exact: true,
					}),
				).toBeDisabled();
				for (const direction of ["ltr", "rtl"]) {
					await page.evaluate((value) => {
						document.documentElement.dir = value;
					}, direction);
					expect(
						await page.evaluate(
							() => document.documentElement.scrollWidth <= innerWidth + 1,
						),
					).toBe(true);
				}
				await page.evaluate(() => {
					document.documentElement.dir = "ltr";
				});
			}
		}
	}
	await selectLanguage(page, "en");
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto("/learn/dns-fundamentals/dns-record-practice");
	const activity = page.getByTestId("lesson-activity");
	const fields = activity.locator("fieldset");
	await expect(
		fields.getByRole("button", { name: "Check answer", exact: true }),
	).toBeDisabled();
	const owner = fields.getByLabel("Owner name", { exact: true });
	const labelGap = await owner.evaluate((e) => {
		const label = e.parentElement?.querySelector("label");
		return label
			? e.getBoundingClientRect().top - label.getBoundingClientRect().bottom
			: Infinity;
	});
	expect(labelGap).toBeLessThanOrEqual(9);
	await owner.fill("app.example.com");
	await fields.getByLabel("Record type", { exact: true }).selectOption("A");
	await fields.getByLabel("Record value", { exact: true }).fill("192.0.2.10");
	await fields
		.getByRole("button", { name: "Check answer", exact: true })
		.click();
	await expect(fields.getByRole("status")).toContainText("Correct");
	await activity.screenshot({
		path: "/tmp/dv-learn-lesson-practice-ui.png",
		animations: "disabled",
	});
	await page.goto("/learn/dns-fundamentals/dns-names-url");
	await page.setViewportSize({ width: 1280, height: 900 });
	await page
		.getByRole("navigation", { name: "Lesson sections", exact: true })
		.getByRole("button", { name: "Worked example", exact: true })
		.click();
	await page.screenshot({
		path: "/tmp/dv-learn-lesson-reading-ui.png",
		animations: "disabled",
	});
	await page
		.getByRole("region", { name: "Worked example", exact: true })
		.screenshot({
			path: "/tmp/dv-learn-lesson-example-ui.png",
			animations: "disabled",
		});
});
