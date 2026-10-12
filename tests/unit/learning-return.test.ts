import { expect, it } from "vitest";
import {
	learningAuthHref,
	learningReturn,
} from "../../src/lib/learning-return";

it("allows only local course/player auth continuations", () => {
	for (const path of [
		"/courses/dns-fundamentals",
		"/learn/dns-fundamentals/dns-names-url",
	]) {
		expect(learningReturn(path)).toBe(path);
		expect(
			new URL(
				learningAuthHref("login", path),
				"https://learn.example",
			).searchParams.get("returnTo"),
		).toBe(path);
	}
	for (const path of [
		null,
		undefined,
		7,
		"https://evil.test",
		"//evil.test",
		"/\\evil.test",
		"/learn/foo/..",
		"/courses/foo?next=evil",
		"/courses/foo#bar",
		"/admin",
		"/courses/foo/",
		"/courses/%2f%2fevil.test",
	])
		expect(learningReturn(path)).toBe("/dashboard");
	expect(learningAuthHref("register", "https://evil.test")).toBe("/register");
});
