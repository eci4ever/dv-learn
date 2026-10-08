import { expect, test } from "@playwright/test";

test("lesson section navigation keeps reading and practice accessible", async ({
	page,
}) => {
	test.setTimeout(60_000);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/learn/dns-fundamentals/dns-names-url");
	const navigation = page.getByRole("navigation", { name: "Lesson sections" });
	await expect(navigation).toBeVisible();
	for (const width of [320, 375, 640, 768, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		for (const theme of ["light", "dark"]) {
			await page.evaluate((value) => {
				document.documentElement.dataset.theme = value;
			}, theme);
			for (const direction of ["ltr", "rtl"]) {
				await page.evaluate((value) => {
					document.documentElement.dir = value;
				}, direction);
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth <= innerWidth + 1,
					),
					`${width} ${theme} ${direction}`,
				).toBe(true);
			}
		}
	}
	await page.evaluate(() => {
		document.documentElement.dir = "ltr";
	});
	const practice = page.getByRole("button", {
		name: "Jump to practice",
		exact: true,
	});
	await practice.focus();
	await page.keyboard.press("Enter");
	const writtenPractice = page.getByRole("region", {
		name: "Practice",
		exact: true,
	});
	await expect(writtenPractice).toBeFocused();
	await navigation
		.getByRole("button", { name: "Worked example", exact: true })
		.click();
	await expect(
		page.getByRole("region", { name: "Worked example", exact: true }),
	).toBeFocused();
	await navigation.getByRole("button", { name: "Recap", exact: true }).click();
	await expect(
		page.getByRole("region", { name: "Recap", exact: true }),
	).toBeFocused();
	await expect(
		page.getByRole("button", { name: "Mark as complete", exact: true }),
	).toBeDisabled();
	await page.goto("/learn/dns-fundamentals/dns-lookup");
	await page
		.getByRole("button", { name: "Jump to practice", exact: true })
		.click();
	await expect(
		page.getByRole("region", { name: "Interactive practice", exact: true }),
	).toBeFocused();
	await expect(page.getByTestId("lesson-activity")).toBeVisible();
});
