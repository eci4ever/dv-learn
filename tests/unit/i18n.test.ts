import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ms from "../../messages/ms.json";
import * as m from "../../src/paraglide/messages.js";
import { getLocale } from "../../src/paraglide/runtime.js";
import { paraglideMiddleware } from "../../src/paraglide/server.js";

describe("BM/EN localisation", () => {
	it("keeps both dictionaries complete with matching placeholders", () => {
		expect(Object.keys(ms).sort()).toEqual(Object.keys(en).sort());
		const placeholders = (value: string) =>
			[...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
		for (const key of Object.keys(en) as (keyof typeof en)[]) {
			expect(ms[key].trim().length).toBeGreaterThan(0);
			expect(placeholders(ms[key])).toEqual(placeholders(en[key]));
		}
	});
	it("isolates concurrent request locales and falls back to English", async () => {
		const results = await Promise.all(
			["ms", "en", "invalid", ""].map((locale) => {
				const request = new Request("https://learn.example/", {
					headers: { Cookie: `PARAGLIDE_LOCALE=${locale}` },
				});
				return paraglideMiddleware(request, async ({ locale: resolved }) => {
					await new Promise((resolve) => setTimeout(resolve, 5));
					expect(getLocale()).toBe(resolved);
					return new Response(`${getLocale()}:${m.browse_courses()}`);
				}).then((response) => response.text());
			}),
		);
		expect(results).toEqual([
			"ms:Lihat kursus",
			"en:Browse courses",
			"en:Browse courses",
			"en:Browse courses",
		]);
	});
});
