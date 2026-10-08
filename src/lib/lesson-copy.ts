/** Limited text/code conventions only; authored HTML is never evaluated. */
const headings = new Set([
	"Before you start",
	"Explain",
	"Worked example",
	"Practice",
	"Recap",
	"Common mistakes",
	"Next step",
	"Self-check — read after practising",
]);
export type ReadingSection = {
	id: number;
	heading: string | null;
	paragraphs: string[];
};

export function lessonSections(content: string): ReadingSection[] {
	const sections: ReadingSection[] = [];
	for (const block of readingBlocks(content)) {
		if (!block.trim()) continue;
		if (headings.has(block.trim()))
			sections.push({
				id: sections.length,
				heading: block.trim(),
				paragraphs: [],
			});
		else {
			if (!sections.length)
				sections.push({ id: 0, heading: null, paragraphs: [] });
			sections[sections.length - 1].paragraphs.push(block);
		}
	}
	return sections;
}

/** Keep closed fences together, including blank lines and heading-like code. */
function readingBlocks(content: string): string[] {
	const lines = content.replaceAll("\r\n", "\n").split("\n");
	const blocks: string[] = [];
	let prose: string[] = [];
	const flush = () => {
		while (prose.length && !prose[0].trim()) prose.shift();
		while (prose.length && !prose[prose.length - 1].trim()) prose.pop();
		blocks.push(...prose.join("\n").split(/\n\s*\n/));
		prose = [];
	};
	for (let index = 0; index < lines.length; index++) {
		const opening = /^(`{3,})([\w+-]*)\s*$/.exec(lines[index]);
		let closing = -1;
		if (opening) {
			const endFence = new RegExp(`^\x60{${opening[1].length},}\\s*$`);
			for (let end = index + 1; end < lines.length; end++) {
				if (endFence.test(lines[end])) {
					closing = end;
					break;
				}
			}
			if (closing === -1) {
				prose.push(...lines.slice(index));
				break;
			}
		}
		if (closing === -1) {
			prose.push(lines[index]);
			continue;
		}
		flush();
		blocks.push(lines.slice(index, closing + 1).join("\n"));
		index = closing;
	}
	flush();
	return blocks;
}

export function fencedCode(
	block: string,
): { language: string; code: string } | null {
	const opening = /^(`{3,})([\w+-]*)\s*\n/.exec(block);
	if (!opening) return null;
	const lastNewline = block.lastIndexOf("\n");
	if (
		!new RegExp(`^\x60{${opening[1].length},}\\s*$`).test(
			block.slice(lastNewline + 1),
		)
	)
		return null;
	return {
		language: opening[2].toLowerCase() || "text",
		code: block.slice(opening[0].length, lastNewline),
	};
}

export function resourceLabel(link: string): string {
	const url = new URL(link);
	const rfc =
		url.hostname === "www.rfc-editor.org" &&
		/^\/rfc\/rfc(\d+)\.html$/.exec(url.pathname);
	if (rfc)
		return `RFC ${rfc[1]}${/^#section-[\d.]+$/.test(url.hash) ? ` · Section ${url.hash.slice(9)}` : ""}`;
	if (
		url.hostname === "www.iana.org" &&
		url.pathname === "/help/example-domains"
	)
		return "Example domains · IANA";
	if (
		url.hostname === "developer.mozilla.org" &&
		url.pathname === "/en-US/docs/Web/URI/Reference/Authority"
	)
		return "URI authority · MDN";
	return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}${url.hash}`;
}
