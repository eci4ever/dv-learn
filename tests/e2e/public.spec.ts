import { expect, test } from "@playwright/test";

// Read-only smoke suite: no registration, email/reset, checkout or bill creation.
// This blocks browser egress only; keep provider keys empty on the local server.
test.beforeEach(async ({ context, baseURL }) => {
	if (!baseURL) throw new Error("Playwright base URL required");
	const origin = new URL(baseURL).origin;
	await context.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (
			(url.origin !== origin && ["http:", "https:"].includes(url.protocol)) ||
			!["GET", "HEAD", "OPTIONS"].includes(route.request().method())
		) {
			await route.abort("blockedbyclient");
			return;
		}
		await route.continue();
	});
});

test("public catalog renders and offers login", async ({ page }) => {
	const response = await page.goto("/");
	expect(response?.status()).toBe(200);
	await expect(page.getByRole("main")).toBeVisible();
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Temui minat. Bina kemahiran." }),
	).toBeVisible();
	await expect(page.locator("#catalog .spinner")).toHaveCount(0);
	await expect(page.locator("#catalog .empty.error")).toHaveCount(0);
	await expect(
		page.locator("#catalog .course-card, #catalog .empty"),
	).not.toHaveCount(0);
	await expect(
		page.getByRole("textbox", { name: "Cari kursus" }),
	).toBeVisible();
	await expect(
		page.locator("header").getByRole("link", { name: "Log masuk" }),
	).toBeVisible();
	await page.locator("header").getByRole("link", { name: "Log masuk" }).click();
	await expect(page).toHaveURL(/\/login$/);
});

test("login form is available without sending credentials", async ({
	page,
}) => {
	await page.goto("/login");
	await expect(page.locator('input[type="email"]')).toBeVisible();
	await expect(page.locator('input[type="password"]')).toBeVisible();
	await expect(
		page.getByRole("button", { name: /log masuk|sign in/i }),
	).toBeVisible();
});

for (const path of ["/dashboard", "/orders", "/admin"]) {
	test(`anonymous visitor cannot access ${path}`, async ({ page }) => {
		await page.goto(path);
		await expect(page.locator("main .empty.error")).toContainText(
			"Please sign in to continue.",
		);
		await expect(
			page
				.locator("main .empty.error")
				.getByRole("link", { name: "Log masuk" }),
		).toBeVisible();
		await expect(
			page.locator(".admin-tabs, .admin-form, .stats, .table-wrap"),
		).toHaveCount(0);
		await expect(page.locator('input[type="password"]')).toHaveCount(0);
	});
}
