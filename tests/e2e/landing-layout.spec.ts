import { expect, test } from "@playwright/test";

for (const locale of ["en", "ms"]) {
	test(`compact catalog keeps full course details reachable (${locale})`, async ({
		page,
	}) => {
		await page.goto(`/?lang=${locale}`);
		await expect(
			page.getByRole("combobox", {
				name: locale === "ms" ? "Bahasa" : "Language",
				exact: true,
			}),
		).toBeEnabled();
		const cards = page.locator("#catalog .course-card");
		await expect(cards).not.toHaveCount(0);
		for (const width of [320, 375, 768, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			await expect(page.locator(".landing-hero h1")).toHaveCSS(
				"font-size",
				width === 1280 ? "56px" : "36px",
			);
			await expect(page.locator("#catalog .section-heading h2")).toHaveCSS(
				"font-size",
				"24px",
			);
			await expect(cards.first().locator("h3")).toHaveCSS("font-size", "18px");
			await expect(cards.first().locator(".card-content > p")).toHaveCSS(
				"font-size",
				"16px",
			);
			const layout = await page.evaluate(() => ({
				overflow: document.documentElement.scrollWidth > innerWidth,
				catalogTop: document.querySelector("#catalog")?.getBoundingClientRect()
					.top,
				cards: [...document.querySelectorAll("#catalog .course-card")].map(
					(card) => ({
						top: card.getBoundingClientRect().top,
						bottom:
							card.querySelector(".card-bottom")?.getBoundingClientRect()
								.bottom ?? 0,
						text: card.querySelector(".card-content > p")?.textContent ?? "",
					}),
				),
			}));
			expect(layout.overflow).toBe(false);
			expect(layout.catalogTop).toBeLessThan(900);
			for (const card of layout.cards) {
				expect(card.text.length).toBeLessThanOrEqual(160);
				for (const peer of layout.cards.filter(
					(item) => Math.abs(item.top - card.top) < 2,
				)) {
					expect(Math.abs(peer.bottom - card.bottom)).toBeLessThanOrEqual(2);
				}
			}
		}
		const synopsis = await cards
			.first()
			.locator(".card-content > p")
			.innerText();
		await cards.first().click();
		await expect(page.locator(".course-detail .lead")).toBeVisible();
		expect(
			(await page.locator(".course-detail .lead").innerText()).length,
		).toBeGreaterThan(synopsis.length);
	});
}
