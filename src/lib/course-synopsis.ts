/** A short card preview; the linked course page retains the full description. */
export function courseSynopsis(description: string) {
	const text = description.replace(/\s+/g, " ").trim();
	if (text.length <= 160) return text;
	const preview = text.slice(0, 160);
	const sentence = preview.lastIndexOf(". ");
	if (sentence >= 60) return preview.slice(0, sentence + 1);
	const word = preview.lastIndexOf(" ");
	return `${preview.slice(0, word > 0 ? word : 159).trimEnd()}…`;
}
