import { expect, test } from "@playwright/test";

test("shared Nimfi logo and favicon assets are available locally", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page.locator(".brand-mark path")).toHaveAttribute(
		"d",
		"M14 33V22C14 17.6 16.9 15 20.5 15C24.1 15 27 17.6 27 22V33",
	);
	await expect(
		page.locator('link[rel="icon"][type="image/svg+xml"]'),
	).toHaveAttribute("href", "/favicon.svg");
	for (const [path, type] of [
		["/favicon.svg", "image/svg+xml"],
		["/favicon.ico", "image/"],
		["/apple-touch-icon.png", "image/png"],
	]) {
		const response = await page.request.get(path);
		expect(response.ok()).toBe(true);
		expect(response.headers()["content-type"]).toContain(type);
	}
});
