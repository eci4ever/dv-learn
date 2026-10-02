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

test("320px catalog supports skip navigation, reflow, reduced motion and clearing search", async ({
	page,
}) => {
	await page.setViewportSize({ width: 320, height: 900 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/");
	await expect(
		page.locator("#catalog .course-card, #catalog .empty"),
	).not.toHaveCount(0);
	await expect(page.locator("#catalog .spinner")).toHaveCount(0);
	await expect(page.locator("#catalog .empty.error")).toHaveCount(0);
	await page.keyboard.press("Tab");
	await expect(
		page.getByRole("link", { name: "Langkau ke kandungan" }),
	).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(page.getByRole("main")).toBeFocused();
	const layout = await page.evaluate(() => {
		const heading = document
			.querySelector(".visual-main h2")
			?.getBoundingClientRect();
		const card = document
			.querySelector(".floating-card")
			?.getBoundingClientRect();
		if (!heading || !card) throw new Error("Hero content required");
		return {
			overlap: card.top < heading.bottom,
			width: document.documentElement.scrollWidth,
		};
	});
	expect(layout.overlap).toBe(false);
	expect(layout.width).toBeLessThanOrEqual(320);
	await page.getByRole("button", { name: "Buka menu" }).click();
	await expect(page.getByRole("dialog", { name: "DV Learn" })).toBeVisible();
	const motion = await page
		.locator('[data-slot="sheet-content"]')
		.evaluate((element) => {
			const style = getComputedStyle(element);
			return { property: style.transitionProperty, translate: style.translate };
		});
	expect(motion.property).toBe("none");
	expect(motion.translate).toBe("0px");
	await page.keyboard.press("Escape");
	await expect(page.getByRole("button", { name: "Buka menu" })).toBeFocused();
	await page
		.getByRole("textbox", { name: "Cari kursus" })
		.fill("unmatched-review-query-4821");
	await expect(page.locator("#catalog .empty")).toContainText(
		"unmatched-review-query-4821",
	);
	await page.getByRole("button", { name: "Kosongkan carian" }).click();
	await expect(page.getByRole("textbox", { name: "Cari kursus" })).toHaveValue(
		"",
	);
	await expect(page).not.toHaveURL(/[?&]q=/);
});

test("login provider errors offer Malay recovery without submitting to the provider", async ({
	page,
}) => {
	await page.route("**/api/auth/sign-in/email", (route) =>
		route.fulfill({
			status: 401,
			contentType: "application/json",
			body: JSON.stringify({
				code: "INVALID_EMAIL_OR_PASSWORD",
				message: "Invalid email or password",
			}),
		}),
	);
	await page.goto("/login");
	await page.locator('[name="email"]').fill("review@example.test");
	await page.locator('[name="password"]').fill("Review-password-4821");
	await page.getByRole("button", { name: "Log masuk ↗", exact: true }).click();
	await expect(page.getByRole("status")).toContainText("Semak maklumat anda");
	await expect(page.getByRole("status")).toContainText("Lupa kata laluan?");
});

test("catalog network error retries the catalog instead of sending visitors to login", async ({
	page,
}) => {
	let unavailable = true;
	await page.route("**/_serverFn/**", (route) =>
		unavailable
			? route.fulfill({
					status: 503,
					contentType: "text/plain",
					body: "Service unavailable",
				})
			: route.fallback(),
	);
	await page.goto("/");
	await expect(page.locator("#catalog .empty.error")).toContainText(
		"Semak sambungan internet",
	);
	await expect(
		page.locator("#catalog").getByRole("link", { name: "Log masuk" }),
	).toHaveCount(0);
	unavailable = false;
	await page.getByRole("button", { name: "Cuba semula" }).click();
	await expect(
		page.locator("#catalog .course-card, #catalog .empty"),
	).not.toHaveCount(0);
	await expect(page.locator("#catalog .spinner")).toHaveCount(0);
	await expect(page.locator("#catalog .empty.error")).toHaveCount(0);
});

for (const mobile of [false, true]) {
	test(`${mobile ? "mobile" : "desktop"} navigation preserves the document and dark theme`, async ({
		page,
	}) => {
		if (mobile) await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await page.getByRole("button", { name: "Tema gelap" }).click();
		const timeOrigin = await page.evaluate(() => performance.timeOrigin);
		let documentRequests = 0;
		page.on("request", (request) => {
			if (
				request.isNavigationRequest() &&
				request.resourceType() === "document"
			)
				documentRequests++;
		});
		if (mobile) await page.getByRole("button", { name: "Buka menu" }).click();
		const navigation = page.getByRole("navigation", {
			name: mobile ? "Navigasi mudah alih" : "Navigasi utama",
		});
		await navigation
			.getByRole("link", { name: "Pesanan", exact: true })
			.click();
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
		expect(documentRequests).toBe(0);
		await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
		if (mobile)
			await expect(page.getByRole("dialog", { name: "DV Learn" })).toBeHidden();
		await page.goBack();
		await expect(page).toHaveURL(/\/$/);
		expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
		await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	});
}

for (const path of ["/dashboard", "/orders", "/admin", "/settings"]) {
	test(`anonymous visitor cannot access ${path}`, async ({ page }) => {
		await page.goto(path);
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(
			page.locator(".admin-tabs, .admin-form, .stats, .table-wrap"),
		).toHaveCount(0);
		await expect(page.locator('input[type="password"]')).toBeVisible();
	});
}

test("theme persists and mobile sheet is keyboard dismissible", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	await page.getByRole("button", { name: "Tema gelap" }).click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	await page.reload();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	await expect(
		page.getByRole("navigation", { name: "Navigasi utama" }),
	).toBeHidden();
	const menu = page.getByRole("button", { name: "Buka menu" });
	await menu.click();
	const sheet = page.getByRole("dialog", { name: "DV Learn" });
	await expect(sheet).toBeVisible();
	await expect(sheet.getByRole("link", { name: "Pesanan" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(sheet).toBeHidden();
	await expect(menu).toBeFocused();
	await page.getByRole("button", { name: "Tema cerah" }).click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
});
