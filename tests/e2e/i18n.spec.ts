import { expect, test } from "@playwright/test";

test("BM/EN persists across reload and navigation without hydration errors", async ({
	page,
	context,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (
			message.type() === "error" &&
			/hydration|did not match/i.test(message.text())
		)
			errors.push(message.text());
	});
	await page.goto("/");
	await expect(page.locator("html")).toHaveAttribute("lang", "en");
	await page
		.getByRole("combobox", { name: "Language", exact: true })
		.selectOption("ms");
	await expect(page.locator("html")).toHaveAttribute("lang", "ms");
	await expect(
		page.getByRole("heading", {
			name: "Pelajari kemahiran baharu. Bina keyakinan.",
		}),
	).toBeVisible();
	for (const width of [320, 375, 768, 1024, 1100, 1101, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth + 1,
			),
			`BM catalog width ${width}`,
		).toBe(true);
	}
	await page
		.getByRole("textbox", { name: "Cari kursus", exact: true })
		.fill("DNS");
	await expect(page).toHaveURL(/q=DNS/);
	expect(
		(await context.cookies()).find(
			(cookie) => cookie.name === "PARAGLIDE_LOCALE",
		)?.value,
	).toBe("ms");
	await page.reload();
	await expect(
		page.getByRole("textbox", { name: "Cari kursus", exact: true }),
	).toHaveValue("DNS");
	await expect(
		page.getByRole("combobox", { name: "Bahasa", exact: true }),
	).toHaveValue("ms");
	await page.goto("/learn/dns-fundamentals/dns-names-url");
	await expect(page.locator("html")).toHaveAttribute("lang", "ms");
	await expect(
		page.getByRole("button", { name: "Tandakan sebagai selesai", exact: true }),
	).toBeDisabled();
	for (const width of [320, 375, 768, 1024, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth + 1,
			),
			`BM width ${width}`,
		).toBe(true);
	}
	await page
		.getByRole("combobox", { name: "Bahasa", exact: true })
		.selectOption("en");
	await expect(page.locator("html")).toHaveAttribute("lang", "en");
	await expect(
		page.getByRole("button", { name: "Mark as complete", exact: true }),
	).toBeDisabled();
	expect(errors).toEqual([]);
});

test("SSR locale follows each cookie and unknown values use English", async ({
	request,
}) => {
	await Promise.all(
		["en", "ms", "invalid"].map(async (locale) => {
			const response = await request.get("/", {
				headers: { Cookie: `PARAGLIDE_LOCALE=${locale}` },
			});
			expect(response.ok()).toBe(true);
			const expected = locale === "ms" ? "ms" : "en";
			expect(await response.text()).toContain(`<html lang="${expected}"`);
			expect(response.headers()["content-language"]).toBe(expected);
			expect(response.headers().vary.toLowerCase()).toContain("cookie");
			expect(response.headers()["cache-control"]).toContain("no-store");
		}),
	);
});
