import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InlineCode, LessonCode } from "../../src/components/lesson-code";

describe("safe syntax highlighting", () => {
	it("highlights JavaScript and shell aliases without changing source text", () => {
		const js = renderToStaticMarkup(
			createElement(LessonCode, { language: "js", code: "const answer = 42;" }),
		);
		expect(js).toContain("hljs-keyword");
		expect(js).toContain("hljs-number");
		const shell = renderToStaticMarkup(
			createElement(LessonCode, { language: "command", code: 'echo "hello"' }),
		);
		expect(shell).toContain("hljs-string");
	});
	it("escapes HTML and uses literal fallback for unknown languages or large blocks", () => {
		for (const language of ["html", "unknown", "text"]) {
			const html = renderToStaticMarkup(
				createElement(LessonCode, {
					language,
					code: "<script>alert(1)</script>",
				}),
			);
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;");
		}
		const large = renderToStaticMarkup(
			createElement(LessonCode, {
				language: "js",
				code: "const ".repeat(4000),
			}),
		);
		expect(large).not.toContain("hljs-keyword");
	});
	it("formats inline code while keeping unclosed backticks and HTML inert", () => {
		expect(
			renderToStaticMarkup(
				createElement(InlineCode, { text: "Run `dig example.com` then read." }),
			),
		).toContain('<code class="lesson-inline-code">dig example.com</code>');
		expect(
			renderToStaticMarkup(
				createElement(InlineCode, { text: "Unclosed `command <script>" }),
			),
		).toContain("Unclosed `command &lt;script&gt;");
	});
});
