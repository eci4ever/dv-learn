import * as m from "../paraglide/messages.js";
export type ContentLanguage = "en" | "ms";
export const learningText = (
	language: ContentLanguage,
	english: string,
	malay: string,
) => (language === "ms" ? malay : english);

const headings: Record<string, (language: ContentLanguage) => string> = {
	"Before you start": (language) =>
		m.learner_heading_0({}, { locale: language }),
	Explain: (language) => m.learner_heading_1({}, { locale: language }),
	"Worked example": (language) => m.learner_heading_2({}, { locale: language }),
	Practice: (language) => m.learner_heading_3({}, { locale: language }),
	Recap: (language) => m.learner_heading_4({}, { locale: language }),
	"Common mistakes": (language) =>
		m.learner_heading_5({}, { locale: language }),
	"Next step": (language) => m.learner_heading_6({}, { locale: language }),
	"Self-check — read after practising": (language) =>
		m.learner_heading_7({}, { locale: language }),
	"Lesson notes": (language) => m.learner_heading_8({}, { locale: language }),
	"Interactive practice": (language) =>
		m.learner_heading_9({}, { locale: language }),
	"Self-check": (language) => m.learner_heading_10({}, { locale: language }),
};
export function learningHeading(heading: string, language: ContentLanguage) {
	return Object.hasOwn(headings, heading)
		? headings[heading](language)
		: heading;
}
