/** Plain-text authoring conventions only: never evaluate HTML or Markdown. */
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
	for (const block of content.split(/\r?\n\s*\r?\n/)) {
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
