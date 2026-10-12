import { expect, test } from "@playwright/test";
import { selectLanguage } from "./helpers/select-language";

test("language and cache Select popups are opaque, readable and fit narrow screens", async ({
	page,
	context,
	baseURL,
}, testInfo) => {
	test.setTimeout(90_000);
	for (const locale of ["en", "ms"]) {
		await context.addCookies([
			{ name: "PARAGLIDE_LOCALE", value: locale, url: baseURL },
		]);
		await page.goto("/learn/dns-fundamentals/dns-lookup");
		const labels =
			locale === "ms" ? ["Bahasa", "Mod cache"] : ["Language", "Cache mode"];
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ["light", "dark"]) {
				await expect(
					page.getByRole("combobox", { name: labels[0], exact: true }),
				).toBeEnabled();
				await page.evaluate((theme) => {
					document.documentElement.dataset.theme = theme;
				}, theme);
				for (const label of labels) {
					const trigger = page.getByRole("combobox", {
						name: label,
						exact: true,
					});
					await expect(trigger).toHaveAttribute("data-slot", "select-trigger");
					await trigger.click();
					const popup = page.locator('[data-slot="select-content"][data-open]');
					await expect(popup).toBeVisible();
					await expect(popup).toHaveCSS("opacity", "1");
					if (label === labels[1])
						await expect(popup).toHaveAttribute("lang", locale);
					const surface = await popup.evaluate((element) => {
						const ctx = document.createElement("canvas").getContext("2d");
						if (!ctx) throw new Error("Canvas unavailable");
						const parse = (value: string) => {
							ctx.clearRect(0, 0, 1, 1);
							ctx.fillStyle = value;
							ctx.fillRect(0, 0, 1, 1);
							return [...ctx.getImageData(0, 0, 1, 1).data];
						};
						const style = getComputedStyle(element);
						const bg = parse(style.backgroundColor),
							fg = parse(style.color);
						const luminance = (color: number[]) =>
							color
								.slice(0, 3)
								.map((n) => n / 255)
								.map((n) =>
									n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
								)
								.reduce(
									(sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i],
									0,
								);
						const a = luminance(bg),
							b = luminance(fg),
							rect = element.getBoundingClientRect();
						return {
							alpha: bg[3],
							contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
							left: rect.left,
							right: rect.right,
							width: innerWidth,
							scroll: element.scrollWidth,
							client: element.clientWidth,
						};
					});
					expect(surface.alpha, `${locale}/${theme}/${width}/${label}`).toBe(
						255,
					);
					expect(surface.contrast).toBeGreaterThanOrEqual(4.5);
					expect(surface.left).toBeGreaterThanOrEqual(0);
					expect(surface.right).toBeLessThanOrEqual(surface.width + 1);
					expect(surface.scroll).toBeLessThanOrEqual(surface.client + 1);
					if (width === 320)
						await page.screenshot({
							path: testInfo.outputPath(
								`${locale}-${theme}-${label.replaceAll(" ", "-")}.png`,
							),
						});
					await page.keyboard.press("Escape");
					await expect(popup).toBeHidden();
					await expect(trigger).toBeFocused();
				}
			}
		}
	}
});

test("cache-mode keyboard selection resets practice and language remains switchable", async ({
	page,
}) => {
	await page.goto("/learn/dns-fundamentals/dns-lookup");
	await page
		.getByLabel("Who receives the next message?", { exact: true })
		.selectOption("resolver");
	await page
		.getByLabel("What is the result of this step?", { exact: true })
		.selectOption("answer");
	await page.getByRole("button", { name: "Check step", exact: true }).click();
	await expect(
		page.getByRole("status").filter({ hasText: "Not quite." }),
	).toBeVisible();
	const mode = page.getByRole("combobox", { name: "Cache mode", exact: true });
	await mode.focus();
	await page.keyboard.press("Enter");
	await expect(page.getByRole("listbox")).toBeVisible();
	await expect(
		page.getByRole("option", {
			name: "Cold: no useful cached data",
			exact: true,
		}),
	).toBeFocused();
	await page.keyboard.press("End");
	await expect(
		page.getByRole("option", {
			name: "Warm: valid cached A answer",
			exact: true,
		}),
	).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(mode).toHaveText("Warm: valid cached A answer");
	await expect(mode).toBeFocused();
	await expect(
		page.getByLabel("Who receives the next message?", { exact: true }),
	).toHaveValue("");
	await expect(
		page.getByLabel("What is the result of this step?", { exact: true }),
	).toHaveValue("");
	await expect(
		page.getByRole("status").filter({ hasText: "Not quite." }),
	).toHaveCount(0);
	await selectLanguage(page, "ms");
	await expect(page).toHaveURL(/\/learn\/dns-fundamentals\/dns-lookup$/);
	await expect(
		page.getByRole("combobox", { name: "Mod cache", exact: true }),
	).toHaveText("Cold: tiada cached data yang berguna");
	await selectLanguage(page, "en");
	await expect(
		page.getByRole("combobox", { name: "Cache mode", exact: true }),
	).toHaveText("Cold: no useful cached data");
});
