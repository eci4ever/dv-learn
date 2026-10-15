import { expect, test } from "@playwright/test";
import { selectLanguage } from "./helpers/select-language";

test("public pages include crawlable HTML and metadata without JavaScript", async ({
	browser,
	baseURL,
}) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		baseURL,
	});
	const page = await context.newPage();
	try {
		for (const path of ["/?lang=en", "/courses/dns-fundamentals?lang=en"]) {
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);
			await expect(page.locator("h1")).toBeVisible();
			await expect(page.locator('meta[name="description"]')).toHaveAttribute(
				"content",
				/\S/,
			);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
				"content",
				"index, follow",
			);
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
				"href",
				`https://learn.nimfi.dev${path}`,
			);
			await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
				"content",
				/social-card\.png$/,
			);
			expect(
				JSON.parse(
					await page.locator('script[type="application/ld+json"]').innerText(),
				)["@type"],
			).toBe(path.startsWith("/courses") ? "Course" : "WebSite");
		}
		await expect(page.locator(".course-lesson-link")).toHaveCount(6);
	} finally {
		await context.close();
	}
});

test("explicit BM/EN overrides the cookie and canonical ignores tracking params", async ({
	page,
	context,
	baseURL,
}) => {
	if (!baseURL) throw new Error("baseURL required");
	await context.addCookies([
		{ name: "PARAGLIDE_LOCALE", value: "en", url: baseURL },
	]);
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/courses/dns-fundamentals?lang=ms&utm_source=seo-check");
	await expect(page.locator("html")).toHaveAttribute("lang", "ms");
	await expect(page.locator("h1")).toHaveText("Asas DNS");
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		"https://learn.nimfi.dev/courses/dns-fundamentals?lang=ms",
	);
	await expect(page.locator('link[hreflang="en"]')).toHaveAttribute(
		"href",
		"https://learn.nimfi.dev/courses/dns-fundamentals?lang=en",
	);
	await selectLanguage(page, "en");
	await expect(page).toHaveURL(/lang=en/);
	await expect(page.locator("h1")).toHaveText("DNS Fundamentals");
	expect(errors).toEqual([]);
});

test("missing resources return HTTP 404 and stay out of indexing", async ({
	request,
}) => {
	for (const path of [
		"/missing-seo-test",
		"/courses/missing-seo-test",
		"/courses/dns-fundamentals/extra",
		"/learn/dns-fundamentals/missing-seo-test",
	]) {
		const response = await request.get(path);
		expect(response.status()).toBe(404);
		expect(await response.text()).toContain('content="noindex, follow"');
	}
});

test("crawler endpoints and share image have the correct response types", async ({
	request,
}) => {
	const robots = await request.get("/robots.txt");
	expect(robots.status()).toBe(200);
	expect(robots.headers()["content-type"]).toContain("text/plain");
	expect(await robots.text()).toContain(
		"Sitemap: https://learn.nimfi.dev/sitemap.xml",
	);
	const sitemap = await request.get("/sitemap.xml");
	expect(sitemap.headers()["content-type"]).toContain("application/xml");
	const xml = await sitemap.text();
	expect(xml).toContain("/courses/dns-fundamentals?lang=en</loc>");
	expect(xml).toContain("/courses/dns-fundamentals?lang=ms</loc>");
	expect(xml).not.toMatch(/\/(admin|login|learn)\//);
	const image = await request.get("/social-card.png");
	expect(image.status()).toBe(200);
	expect(image.headers()["content-type"]).toContain("image/png");
});
