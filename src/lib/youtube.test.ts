import { describe, expect, it } from "vitest";
import { youtubeId } from "./youtube";

describe("YouTube source normalization", () => {
	it.each([
		"https://youtu.be/abcdefghijk?t=12",
		"https://www.youtube.com/watch?v=abcdefghijk",
		"https://youtube.com/shorts/abcdefghijk",
	])("accepts official sources %s", (url) =>
		expect(youtubeId(url)).toBe("abcdefghijk"),
	);
	it.each([
		"https://evil.example/watch?v=abcdefghijk",
		"https://youtube.com.evil.example/watch?v=abcdefghijk",
		"javascript:alert(1)",
		"https://youtu.be/short",
	])("rejects invalid source %s", (url) => expect(youtubeId(url)).toBeNull());
});
