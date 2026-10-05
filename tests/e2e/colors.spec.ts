import { expect, test } from "@playwright/test";

// Read-only checks of rendered pairs, including inherited backgrounds.
test.beforeEach(async ({ context, baseURL }) => {
	if (!baseURL) throw new Error("Base URL required");
	const origin = new URL(baseURL).origin;
	await context.route("**/*", (route) =>
		new URL(route.request().url()).origin === origin &&
		["GET", "HEAD", "OPTIONS"].includes(route.request().method())
			? route.continue()
			: route.abort(),
	);
});

test("approved light and dark palettes keep reading and action text legible", async ({
	page,
}) => {
	await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
	await page.goto("/");
	await expect(page.getByRole("button", { name: "Dark theme" })).toBeVisible();
	for (const theme of ["light", "dark"] as const) {
		if (theme === "dark")
			await page.getByRole("button", { name: "Dark theme" }).click();
		await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
		const action = page.locator(".hero .button");
		await expect(action).toHaveCSS(
			"background-color",
			theme === "light" ? "rgb(79, 70, 229)" : "rgb(165, 180, 252)",
		);
		await expect(action).toHaveCSS(
			"color",
			theme === "light" ? "rgb(255, 255, 255)" : "rgb(2, 6, 23)",
		);
		for (const selector of [
			"body",
			".hero-copy > p",
			".floating-card",
			".hero .button",
			".visual-main > span",
			".callout p",
			".catalog-toolbar > span",
		]) {
			const pair = await page.locator(selector).evaluate((element) => {
				const parse = (color: string) =>
					(color.match(/[\d.]+/g) ?? []).map(Number);
				const luminance = (rgb: number[]) => {
					const c = rgb.slice(0, 3).map((v) => {
						const s = v / 255;
						return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
					});
					return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
				};
				const stack: number[][] = [];
				let ancestor: Element | null = element;
				while (ancestor) {
					stack.push(parse(getComputedStyle(ancestor).backgroundColor));
					ancestor = ancestor.parentElement;
				}
				let background = [255, 255, 255];
				for (const rgb of stack.reverse()) {
					const alpha = rgb[3] ?? 1;
					background = background.map(
						(v, i) => rgb[i] * alpha + v * (1 - alpha),
					);
				}
				const foreground = parse(getComputedStyle(element).color);
				const a = luminance(foreground),
					b = luminance(background);
				return {
					foreground,
					background,
					ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
				};
			});
			expect(
				pair.ratio,
				`${theme} ${selector}: ${JSON.stringify(pair)}`,
			).toBeGreaterThanOrEqual(4.5);
		}
		await action.hover();
		await expect(action).toHaveCSS(
			"background-color",
			theme === "light" ? "rgb(67, 56, 202)" : "rgb(129, 140, 248)",
		);
		await page.mouse.move(0, 0);
	}
});
