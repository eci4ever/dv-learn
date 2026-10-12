import { createContext, useContext } from "react";
import { type ContentLanguage, learningText } from "../lib/learning-text";

export const LessonLanguage = createContext<ContentLanguage>("en");
export function useLessonCopy() {
	const language = useContext(LessonLanguage);
	return (english: string, malay: string) =>
		learningText(language, english, malay);
}
