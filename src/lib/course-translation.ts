import { z } from "zod";
import { parseActivity } from "./lesson-activity.ts";

const title = z.string().trim().min(1).max(200);
export const translatedCourse = z
	.object({
		title,
		description: z.string().max(20000),
		level: z.string().max(100),
	})
	.strict();
export const translatedSection = z.object({ title }).strict();
export const translatedLesson = z
	.object({
		title,
		description: z.string().max(20000),
		content: z.string().max(100000),
		activityConfig: z.string().max(64000).nullable(),
	})
	.strict();

export function courseSource(course: {
	title: string;
	description: string;
	level: string;
	contentLanguage?: "en" | "ms";
}) {
	return {
		title: course.title,
		description: course.description,
		level: course.level,
		contentLanguage: course.contentLanguage ?? "en",
	};
}
export function lessonSource(lesson: {
	title: string;
	description: string;
	content: string;
	activityConfig?: string | null;
}) {
	return {
		title: lesson.title,
		description: lesson.description,
		content: lesson.content,
		activityConfig: lesson.activityConfig ?? null,
	};
}
export function sourceMatches(
	snapshot: string,
	current: Record<string, string | null>,
) {
	try {
		const source = z
			.record(z.string(), z.string().nullable())
			.parse(JSON.parse(snapshot));
		return (
			Object.keys(source).length === Object.keys(current).length &&
			Object.entries(current).every(([key, value]) => source[key] === value)
		);
	} catch {
		return false;
	}
}

/** Only display copy may change. IDs, answer keys, record values and simulation numbers must match. */
export function activityTranslationMatches(
	original?: string | null,
	translation?: string | null,
) {
	if (!original || !translation) return !original && !translation;
	const a = parseActivity(original),
		b = parseActivity(translation);
	if (!a || !b) return false;
	function grading(value: unknown): unknown {
		if (Array.isArray(value)) return value.map(grading);
		if (value && typeof value === "object")
			return Object.fromEntries(
				Object.entries(value)
					.filter(
						([key]) =>
							![
								"title",
								"prompt",
								"text",
								"label",
								"hint",
								"explanation",
							].includes(key),
					)
					.sort(([x], [y]) => x.localeCompare(y))
					.map(([key, item]) => [key, grading(item)]),
			);
		return value;
	}
	return JSON.stringify(grading(a)) === JSON.stringify(grading(b));
}
