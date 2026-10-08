import { expect, test } from "@playwright/test";

test("course lessons use clear action rows without underlined titles", async ({
	page,
}) => {
	await page.goto("/courses/dns-fundamentals");
	const rows = page.locator(".course-detail .course-lesson-link");
	await expect(rows).toHaveCount(6);
	await page.emulateMedia({ reducedMotion: "reduce" });
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
			for (const row of await rows.all()) {
				await expect(row).toBeVisible();
				await expect(row).toHaveCSS("text-decoration-line", "none");
				await expect(row.locator("[data-slot=badge]")).toHaveText("Preview");
				const dimensions = await row.boundingBox();
				expect(dimensions?.height).toBeGreaterThanOrEqual(44);
			}
			const first = rows.first();
			await first.hover();
			await expect(first).toHaveCSS("text-decoration-line", "none");
			await expect(first).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
			await first.focus();
			await expect(first).toBeFocused();
			await expect(first).toHaveCSS("text-decoration-line", "none");
			await expect(first).toHaveCSS("outline-style", "solid");
		}
	}
	const trigger = page
		.locator(".course-detail [data-slot=accordion-trigger]")
		.first();
	await trigger.focus();
	await page.keyboard.press("Enter");
	await expect(trigger).toHaveAttribute("aria-expanded", "false");
	await page.keyboard.press("Enter");
	await expect(trigger).toHaveAttribute("aria-expanded", "true");
	await rows.first().focus();
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL(/\/learn\/dns-fundamentals\/dns-names-url/);
});
