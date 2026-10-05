import { describe, expect, it } from "vitest";
import { lessonSections, resourceLabel } from "../../src/lib/lesson-copy";

describe("plain-text lesson reading", () => {
	it("recognizes standalone authoring headings and keeps paragraphs in order", () => {
		expect(
			lessonSections(
				"Explain\n\nFirst paragraph.\n\nSecond paragraph.\n\nPractice\n\n1. Try this\n2. Try that\n\nRecap\n\nRemember this.",
			),
		).toEqual([
			{
				id: 0,
				heading: "Explain",
				paragraphs: ["First paragraph.", "Second paragraph."],
			},
			{ id: 1, heading: "Practice", paragraphs: ["1. Try this\n2. Try that"] },
			{ id: 2, heading: "Recap", paragraphs: ["Remember this."] },
		]);
	});
	it("keeps unstructured legacy notes and HTML-looking strings as literal text", () => {
		expect(
			lessonSections(
				"Draft notes\n\nRecap is not a heading here.\n\n<script>alert(1)</script>",
			),
		).toEqual([
			{
				id: 0,
				heading: null,
				paragraphs: [
					"Draft notes",
					"Recap is not a heading here.",
					"<script>alert(1)</script>",
				],
			},
		]);
		expect(lessonSections("  ")).toEqual([]);
		expect(lessonSections("  code\n    indented")[0].paragraphs).toEqual([
			"  code\n    indented",
		]);
	});
	it("supports CRLF, explicit self-check sections and repeated headings", () => {
		const sections = lessonSections(
			"Practice\r\n\r\nTry first.\r\n\r\nSelf-check — read after practising\r\n\r\nAnswer.\r\n\r\nPractice\r\n\r\nTry again.",
		);
		expect(sections.map((s) => s.id)).toEqual([0, 1, 2]);
		expect(sections[1].paragraphs).toEqual(["Answer."]);
	});
	it("names reference links without changing their destinations", () => {
		expect(
			resourceLabel("https://www.rfc-editor.org/rfc/rfc1034.html#section-3.1"),
		).toBe("RFC 1034 · Section 3.1");
		expect(resourceLabel("https://www.iana.org/help/example-domains")).toBe(
			"Example domains · IANA",
		);
		expect(
			resourceLabel(
				"https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Authority",
			),
		).toBe("URI authority · MDN");
		expect(resourceLabel("https://example.test/guide")).toBe(
			"example.test/guide",
		);
	});
});
