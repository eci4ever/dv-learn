export type ContentLanguage = "en" | "ms";
export const learningText = (
	language: ContentLanguage,
	english: string,
	malay: string,
) => (language === "ms" ? malay : english);

const headings: Record<string, string> = {
	"Before you start": "Sebelum bermula",
	Explain: "Penerangan",
	"Worked example": "Contoh",
	Practice: "Latihan",
	Recap: "Ringkasan",
	"Common mistakes": "Kesilapan lazim",
	"Next step": "Langkah seterusnya",
	"Self-check — read after practising": "Self-check — baca selepas berlatih",
	"Lesson notes": "Nota pelajaran",
	"Interactive practice": "Latihan interaktif",
	"Self-check": "Self-check",
};
export function learningHeading(heading: string, language: ContentLanguage) {
	return language === "ms" && Object.hasOwn(headings, heading)
		? headings[heading]
		: heading;
}
