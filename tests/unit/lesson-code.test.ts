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
	it("highlights command names and flags, including normalized language labels", () => {
		const html = renderToStaticMarkup(
			createElement(LessonCode, {
				language: " BASH ",
				code: 'dig --help\ncurl -I "https://example.com"\n# a comment',
			}),
		);
		expect(html).toContain('class="hljs-built_in">dig</span>');
		expect(html).toContain('class="hljs-attr">--help</span>');
		expect(html).toContain('class="hljs-attr">-I</span>');
		expect(html).toContain('class="hljs-comment"># a comment</span>');
	});
	it("separates console prompts and commands from literal output", () => {
		const html = renderToStaticMarkup(
			createElement(LessonCode, {
				language: "console",
				code: '$ dig --help\nconst answer = 42;\n$ echo "done"',
			}),
		);
		expect(html).toContain("hljs-meta prompt_");
		expect(html).toContain("hljs-built_in");
		expect(html).not.toContain("hljs-number");
	});
	it("preserves shell keywords and does not tokenize commands inside strings", () => {
		const html = renderToStaticMarkup(
			createElement(LessonCode, {
				language: "sh",
				code: 'if true; then\n  echo "dig --help"\nfi',
			}),
		);
		expect(html).toContain('class="hljs-keyword">if</span>');
		expect(html).toContain('class="hljs-string">&quot;dig --help&quot;</span>');
		expect(html).not.toContain('class="hljs-attr"');
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
