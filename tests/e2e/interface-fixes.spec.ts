import { expect, test } from "@playwright/test";
import { selectLanguage } from "./helpers/select-language";

test("course enrollment and localized copy fit narrow layouts in both themes", async ({
	page,
	baseURL,
}) => {
	test.setTimeout(90_000);
	for (const locale of ["en", "ms"]) {
		await page.context().addCookies([
			{
				name: "PARAGLIDE_LOCALE",
				value: locale,
				url: baseURL,
			},
		]);
		await page.goto("/courses/dns-fundamentals");
		const panel = page.locator("#purchase section");
		await expect(panel).toBeVisible();
		for (const width of [320, 375, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			for (const theme of ["light", "dark"]) {
				await page.evaluate((theme) => {
					document.documentElement.dataset.theme = theme;
				}, theme);
				const clipped = await panel.evaluate((element) =>
					[...element.querySelectorAll("p,a,button")]
						.filter((child) => {
							const box = child.getBoundingClientRect();
							let parent = child.parentElement;
							while (parent) {
								const bounds = parent.getBoundingClientRect();
								if (
									getComputedStyle(parent).overflowX === "hidden" &&
									(box.left < bounds.left - 1 || box.right > bounds.right + 1)
								)
									return true;
								parent = parent.parentElement;
							}
							return child.scrollWidth > child.clientWidth + 1;
						})
						.map((child) => child.textContent),
				);
				expect(clipped, `${locale}/${theme}/${width}`).toEqual([]);
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth <= innerWidth + 1,
					),
				).toBe(true);
			}
		}
		if (locale === "ms") {
			await expect(
				page.getByRole("link", { name: "← Semua kursus", exact: true }),
			).toBeVisible();
			await expect(page.getByText("2 pelajaran", { exact: true })).toHaveCount(
				3,
			);
			await expect(
				page.getByText("✓ Belajar pada bila-bila masa", { exact: true }),
			).toBeVisible();
			await expect(
				page.getByText("✓ Belajar menggunakan komputer atau telefon", {
					exact: true,
				}),
			).toBeVisible();
		}
	}
});

test("glossary respects reduced motion and restores keyboard focus", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/learn/dns-fundamentals/dns-names-url");
	await expect(
		page.getByRole("combobox", { name: "Language", exact: true }),
	).toBeEnabled();
	const trigger = page.getByRole("button", {
		name: "Explain TTL",
		exact: true,
	});
	await trigger.focus();
	await page.keyboard.press("Enter");
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	const frames = await dialog.evaluate((element) =>
		element
			.getAnimations()
			.flatMap((animation) =>
				animation.effect instanceof KeyframeEffect
					? animation.effect.getKeyframes()
					: [],
			),
	);
	expect(frames.some((frame) => String(frame.transform).includes("0.95"))).toBe(
		false,
	);
	expect(
		await dialog.evaluate((element) =>
			getComputedStyle(element).getPropertyValue("--tw-enter-scale"),
		),
	).not.toContain(".95");
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
});

test("keyboard lesson navigation focuses the new heading and updates the tab title", async ({
	page,
}) => {
	await page.goto("/courses/dns-fundamentals");
	await expect(
		page.getByRole("combobox", { name: "Language", exact: true }),
	).toBeEnabled();
	await page
		.getByRole("link", { name: "Start course — Free", exact: true })
		.focus();
	await page.keyboard.press("Enter");
	const heading = page.getByRole("heading", {
		level: 1,
		name: "Find the name inside a URL",
		exact: true,
	});
	await expect(heading).toBeFocused();
	await expect(page).toHaveTitle("Find the name inside a URL — DV Learn");
	await page.getByRole("link", { name: "Next lesson →", exact: true }).focus();
	await page.keyboard.press("Enter");
	await expect(
		page.getByRole("heading", {
			level: 1,
			name: "Follow a DNS lookup",
			exact: true,
		}),
	).toBeFocused();
	await expect(page).toHaveTitle("Follow a DNS lookup — DV Learn");
	await page.goBack();
	await expect(heading).toBeFocused();
	await expect(page).toHaveTitle("Find the name inside a URL — DV Learn");
	await page.goForward();
	await expect(page).toHaveTitle("Follow a DNS lookup — DV Learn");
	await page.setViewportSize({ width: 375, height: 812 });
	await page
		.getByRole("button", { name: "Course content", exact: true })
		.focus();
	await page.keyboard.press("Enter");
	await page
		.getByRole("dialog")
		.getByRole("link", { name: /Find the name inside a URL/ })
		.focus();
	await page.keyboard.press("Enter");
	await expect(page.getByRole("dialog")).toBeHidden();
	await expect(heading).toBeFocused();
	await expect(page).toHaveTitle("Find the name inside a URL — DV Learn");
	await selectLanguage(page, "ms");
	await expect(page).toHaveTitle("Cari hostname dalam URL — DV Learn");
});

test("quiz feedback updates an existing empty live region and keeps it on retry", async ({
	page,
}) => {
	await page.goto("/learn/dns-fundamentals/dns-self-check");
	await expect(
		page.getByRole("combobox", { name: "Language", exact: true }),
	).toBeEnabled();
	const status = page
		.getByTestId("lesson-activity")
		.getByRole("status")
		.first();
	await expect(status).toBeEmpty();
	await status.evaluate((element) => {
		element.setAttribute("data-stable-region", "original");
	});
	await page.getByRole("radio").first().check();
	await page.getByRole("button", { name: "Check answer", exact: true }).click();
	await expect(status).toHaveAttribute("data-stable-region", "original");
	await expect(status).toContainText("Not quite.");
	await page.getByRole("radio").nth(1).check();
	await expect(status).toBeEmpty();
	await page.getByRole("button", { name: "Check answer", exact: true }).click();
	await expect(status).toHaveAttribute("data-stable-region", "original");
	await expect(status).toContainText("Correct.");
	await page.getByRole("button", { name: "Reset quiz", exact: true }).click();
	await expect(status).toBeEmpty();
});
