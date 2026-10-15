import { expect, it } from "vitest";
import {
	jsonLd,
	localeFromUrl,
	localizedHref,
	publicHead,
} from "../../src/lib/seo";

it("uses only supported explicit URL languages", () => {
	expect(localeFromUrl("/?lang=ms")).toBe("ms");
	expect(localeFromUrl("/?lang=en")).toBe("en");
	expect(localeFromUrl("/?lang=other")).toBeUndefined();
	expect(localeFromUrl("/")).toBeUndefined();
});
it("preserves search and anchor when changing languages", () => {
	expect(localizedHref("/?q=DNS&lang=en#catalog", "ms")).toBe(
		"/?q=DNS&lang=ms#catalog",
	);
});
it("does not advertise a translation that does not exist", () => {
	const head = publicHead({
		title: "Course",
		description: "A course",
		path: "/courses/sample",
		locale: "en",
		languages: ["en"],
	});
	expect(
		head.links.filter((link) => "hrefLang" in link).map((link) => link.href),
	).toEqual([
		"https://learn.nimfi.dev/courses/sample?lang=en",
		"https://learn.nimfi.dev/courses/sample?lang=en",
	]);
});
it("keeps course text from breaking out of JSON-LD script tags", () => {
	const name = '</script><script>alert("test")</script>';
	const text = jsonLd({ name });
	expect(text).not.toContain("<");
	expect(JSON.parse(text)).toEqual({ name });
});
