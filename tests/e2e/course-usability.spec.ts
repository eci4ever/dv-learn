import { expect, test } from "@playwright/test";
import { selectLanguage } from "./helpers/select-language";

test("free course offers a clear start, keyboard glossary and honest language labels", async ({
	page,
}, testInfo) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/courses/dns-fundamentals");
	await expect(
		page.getByText("6 lessons · about 55 min", { exact: true }),
	).toBeVisible();
	await expect(page.getByText("No video", { exact: true })).toBeVisible();
	await expect(
		page.getByText("Course language: English", { exact: true }),
	).toBeVisible();
	await page.screenshot({
		path: testInfo.outputPath("free-course-overview.png"),
		fullPage: true,
	});
	await page
		.getByRole("link", { name: "Start course — Free", exact: true })
		.click();
	await expect(page).toHaveURL(/\/learn\/dns-fundamentals\/dns-names-url$/);
	await expect(
		page.getByRole("button", { name: "Mark as complete", exact: true }),
	).toBeDisabled();
	const term = page.getByRole("button", { name: "Explain TTL", exact: true });
	await term.focus();
	await page.keyboard.press("Enter");
	const dialog = page.getByRole("dialog");
	await expect(
		dialog.getByRole("heading", { name: "TTL", exact: true }),
	).toBeVisible();
	await expect(dialog).toHaveAttribute("lang", "en");
	await expect(dialog.getByText(/Time to live:/)).toBeVisible();
	await page.setViewportSize({ width: 375, height: 812 });
	await page.screenshot({
		path: testInfo.outputPath("glossary-mobile.png"),
		fullPage: true,
	});
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	await expect(term).toBeFocused();
	await selectLanguage(page, "ms");
	await expect(
		page.getByRole("combobox", { name: "Bahasa", exact: true }),
	).toBeEnabled();
	await expect(page.getByText(/Bahasa kandungan: Bahasa Melayu/)).toBeVisible();
	await expect(
		page.getByRole("heading", {
			name: "Cari hostname dalam URL",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("article", { name: "Bacaan pelajaran" }),
	).toHaveJSProperty("lang", "");
	await expect(
		page
			.locator('[lang="ms"]')
			.filter({ has: page.getByRole("article", { name: "Bacaan pelajaran" }) })
			.last(),
	).toBeVisible();
	await selectLanguage(page, "en");
	await expect(
		page.getByRole("combobox", { name: "Language", exact: true }),
	).toBeEnabled();
	await page
		.getByRole("link", { name: "Sign in to save progress", exact: true })
		.click();
	expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
		"/learn/dns-fundamentals/dns-names-url",
	);
	await page.getByRole("link", { name: "Create account", exact: true }).click();
	expect(new URL(page.url()).pathname).toBe("/register");
	expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
		"/learn/dns-fundamentals/dns-names-url",
	);
	expect(errors).toEqual([]);
});
