import { expect, type Page } from "@playwright/test";

export async function selectLanguage(page: Page, locale: "en" | "ms") {
	await page.getByRole("combobox", { name: /^(Language|Bahasa)$/ }).click();
	await page
		.getByRole("option", { name: locale === "ms" ? "BM" : "EN", exact: true })
		.click();
	await expect(page.locator("html")).toHaveAttribute("lang", locale);
	await expect(
		page.getByRole("combobox", {
			name: locale === "ms" ? "Bahasa" : "Language",
			exact: true,
		}),
	).toBeEnabled();
}
