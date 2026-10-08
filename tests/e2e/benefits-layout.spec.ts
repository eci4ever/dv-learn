import { expect, test } from "@playwright/test";

test("benefit text stays inside its item in BM and EN", async ({
	page,
	context,
	baseURL,
}) => {
	for (const locale of ["ms", "en"]) {
		await context.addCookies([
			{
				name: "PARAGLIDE_LOCALE",
				value: locale,
				url: baseURL ?? "http://localhost:3002",
			},
		]);
		await page.goto("/");
		await page.evaluate(() => document.fonts.ready);
		await expect(
			page.locator(".benefits > span > [aria-hidden=true]"),
		).toHaveCount(4);
		for (const width of [320, 375, 640, 760, 768, 1024, 1280, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			for (const direction of ["ltr", "rtl"]) {
				await page.evaluate((value) => {
					document.documentElement.dir = value;
				}, direction);
				const violations = await page
					.locator(".benefits")
					.evaluate((container) => {
						const bounds = container.getBoundingClientRect();
						return [...container.children].flatMap((item, index) => {
							const box = item.getBoundingClientRect();
							const text = item.querySelector("strong");
							if (!text) return [`${index}: missing text`];
							const range = document.createRange();
							range.selectNodeContents(text);
							const clipped = [...range.getClientRects()].some(
								(rect) =>
									rect.left < box.left - 1 ||
									rect.right > box.right + 1 ||
									rect.top < box.top - 1 ||
									rect.bottom > box.bottom + 1,
							);
							return clipped ||
								item.scrollWidth > item.clientWidth + 1 ||
								box.left < bounds.left - 1 ||
								box.right > bounds.right + 1
								? [`${index}: overflowing benefit`]
								: [];
						});
					});
				expect(violations, `${locale} ${width} ${direction}`).toEqual([]);
			}
		}
	}
});
