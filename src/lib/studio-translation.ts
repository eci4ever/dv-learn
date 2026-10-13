import { z } from "zod";
import {
	activityTranslationMatches,
	sourceMatches,
	translatedCourse,
	translatedLesson,
	translatedSection,
} from "./course-translation";

export const translationKind = z.enum(["course", "section", "lesson"]);
export type TranslationKind = z.infer<typeof translationKind>;
const key = {
	courseId: z.string().min(1).max(100),
	id: z.string().min(1).max(100),
};
export const translationKey = z.object({ ...key, kind: translationKind });
const versions = {
	...key,
	sourceVersion: z.string().length(64),
	translationVersion: z.string().length(64).nullable(),
};
export const saveTranslationInput = z.discriminatedUnion("kind", [
	z.object({
		...versions,
		kind: z.literal("course"),
		payload: translatedCourse.extend({
			description: z.string().trim().min(1).max(20000),
		}),
	}),
	z.object({
		...versions,
		kind: z.literal("section"),
		payload: translatedSection,
	}),
	z.object({
		...versions,
		kind: z.literal("lesson"),
		payload: translatedLesson,
	}),
]);
export type TranslationPayload = {
	title: string;
	description?: string;
	level?: string;
	content?: string;
	activityConfig?: string | null;
};
export type TranslationRow = { source: string; payload: string };
export type TranslationState = "missing" | "stale" | "incomplete" | "ready";
export type TranslationSource = {
	title: string;
	description?: string;
	level?: string;
	content?: string;
	activityConfig?: string | null;
	contentLanguage?: "en" | "ms";
};

export function parseTranslation(
	kind: TranslationKind,
	value: unknown,
	source: TranslationSource,
	lessonType?: string,
): TranslationPayload {
	if (kind === "course") {
		const payload = translatedCourse.parse(value);
		if (!payload.description.trim()) throw Error("TRANSLATION_INCOMPLETE");
		return payload;
	}
	if (kind === "section") return translatedSection.parse(value);
	const payload = translatedLesson.parse(value);
	if (lessonType === "reading" && !payload.content.trim())
		throw Error("TRANSLATION_INCOMPLETE");
	if (
		!activityTranslationMatches(source.activityConfig, payload.activityConfig)
	)
		throw Error("TRANSLATION_ACTIVITY_INVALID");
	return payload;
}

export function translationState(
	kind: TranslationKind,
	source: Record<string, string | null>,
	row: TranslationRow | null,
	lessonType?: string,
): TranslationState {
	if (!row) return "missing";
	if (!sourceMatches(row.source, source)) return "stale";
	try {
		parseTranslation(
			kind,
			JSON.parse(row.payload),
			{ title: source.title ?? "", activityConfig: source.activityConfig },
			lessonType,
		);
		return "ready";
	} catch {
		return "incomplete";
	}
}

/** Only text leaves are editable; simulation values and grading stay read-only. */
export function activityTextFields(config: string | null) {
	let parsed: unknown = null;
	try {
		parsed = config ? JSON.parse(config) : null;
	} catch {
		return [];
	}
	const fields: { path: (string | number)[]; text: string }[] = [];
	function visit(value: unknown, path: (string | number)[]) {
		if (Array.isArray(value))
			value.forEach((item, i) => {
				visit(item, [...path, i]);
			});
		else if (value && typeof value === "object")
			for (const [key, item] of Object.entries(value)) {
				const next = [...path, key];
				if (
					["title", "prompt", "text", "label", "hint", "explanation"].includes(
						key,
					) &&
					typeof item === "string"
				)
					fields.push({ path: next, text: item });
				else visit(item, next);
			}
	}
	visit(parsed, []);
	return fields;
}

export function setActivityText(
	config: string,
	path: (string | number)[],
	text: string,
): string {
	if (
		!activityTextFields(config).some(
			(field) => JSON.stringify(field.path) === JSON.stringify(path),
		)
	)
		throw Error("TRANSLATION_ACTIVITY_INVALID");
	const value: unknown = JSON.parse(config);
	let target: unknown = value;
	for (const key of path.slice(0, -1)) {
		if (!target || typeof target !== "object")
			throw Error("TRANSLATION_ACTIVITY_INVALID");
		target = Reflect.get(target, key);
	}
	if (!target || typeof target !== "object")
		throw Error("TRANSLATION_ACTIVITY_INVALID");
	Reflect.set(target, path[path.length - 1], text);
	return JSON.stringify(value);
}
