import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";
import { createElement, type ReactNode, useMemo } from "react";

const highlighter = createLowlight({
	bash,
	css,
	javascript,
	json,
	powershell,
	python,
	sql,
	typescript,
	xml,
	yaml,
});
highlighter.registerAlias({
	bash: ["sh", "shell", "command", "console", "terminal", "zsh"],
});
type SyntaxNode = ReturnType<typeof highlighter.highlight>["children"][number];

function token(node: SyntaxNode, key: string): ReactNode {
	if (node.type === "text") return node.value;
	if (node.type !== "element") return null;
	// Only highlighter-generated spans are rendered, never authored HTML.
	return createElement(
		"span",
		{
			key,
			className: Array.isArray(node.properties.className)
				? node.properties.className.join(" ")
				: undefined,
		},
		node.children.map((child, index) => token(child, `${key}-${index}`)),
	);
}

export function LessonCode({
	code,
	language,
}: {
	code: string;
	language: string;
}) {
	const highlighted = useMemo(() => {
		if (!highlighter.registered(language) || code.length > 20_000) return code;
		try {
			return highlighter
				.highlight(language, code)
				.children.map((node, index) => token(node, String(index)));
		} catch {
			return code;
		}
	}, [code, language]);
	return (
		<div className="lesson-code min-w-0 overflow-hidden rounded-xl border border-border">
			<div className="bg-muted px-4 py-2 text-sm font-medium">{language}</div>
			{/* biome-ignore-start lint/a11y/noNoninteractiveTabindex: Enable keyboard scrolling for wide code. */}
			{/* biome-ignore lint/a11y/useSemanticElements: Retain preformatted semantics for this named code region. */}
			<pre
				role="region"
				tabIndex={0}
				aria-label={`${language} code`}
				className="m-0 overflow-x-auto p-4 focus-visible:outline-2 focus-visible:outline-ring"
			>
				<code>{highlighted}</code>
			</pre>
			{/* biome-ignore-end lint/a11y/noNoninteractiveTabindex: End keyboard-scrollable code region. */}
		</div>
	);
}

export function InlineCode({ text }: { text: string }) {
	return text.split(/((?<!`)`[^`\n]+`(?!`))/).map((part, index) =>
		/^`[^`\n]+`$/.test(part) ? (
			// biome-ignore lint/suspicious/noArrayIndexKey: Immutable token positions within this text.
			<code key={index} className="lesson-inline-code">
				{part.slice(1, -1)}
			</code>
		) : (
			part
		),
	);
}
