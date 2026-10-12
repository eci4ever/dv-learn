import type { z } from "zod";
import {
	activityTranslationMatches,
	courseSource,
	lessonSource,
	sourceMatches,
	translatedCourse,
	translatedLesson,
	translatedSection,
} from "../lib/course-translation";
import { getLocale } from "../paraglide/runtime.js";
import type { Course, CourseResponse, Lesson } from "./contracts";
import { rows } from "./data";

type TranslationRow = {
	id: string;
	locale: "en" | "ms";
	source: string;
	payload: string;
};
function read<T>(row: TranslationRow | undefined, schema: z.ZodType<T>) {
	try {
		return row ? schema.parse(JSON.parse(row.payload)) : null;
	} catch {
		return null;
	}
}

export async function translatedCatalog(courses: Course[]) {
	const all = await rows<TranslationRow>(
		"SELECT course_id AS id,locale,source,payload FROM course_translations",
	);
	return courses.map((course) => {
		const base = course.contentLanguage ?? "en";
		const valid = all.filter(
			(row) =>
				row.id === course.id &&
				sourceMatches(row.source, courseSource(course)) &&
				read(row, translatedCourse),
		);
		const active = valid.find(
			(row) => row.locale === getLocale() && row.locale !== base,
		);
		return {
			...course,
			...read(active, translatedCourse),
			contentLanguage: active?.locale ?? base,
			availableContentLanguages: [
				...new Set([base, ...valid.map((row) => row.locale)]),
			],
		};
	});
}

/** Apply display copy only after the caller has resolved visibility and access. */
export async function learningTranslations(courses: Course[]) {
	const all = await rows<TranslationRow>(
		"SELECT course_id AS id,locale,source,payload FROM course_translations",
	);
	return new Map(
		await Promise.all(
			courses.map(
				async (course) =>
					[
						course.id,
						await learningTranslation(
							course,
							all.filter((row) => row.id === course.id),
						),
					] as const,
			),
		),
	);
}

export async function learningTranslation(
	course: Course,
	metadata?: TranslationRow[],
) {
	const base = course.contentLanguage ?? "en";
	const requested = getLocale();
	const candidates =
		metadata ??
		(await rows<TranslationRow>(
			"SELECT course_id AS id,locale,source,payload FROM course_translations WHERE course_id=?",
			course.id,
		));
	const valid = candidates.filter(
		(row) =>
			sourceMatches(row.source, courseSource(course)) &&
			read(row, translatedCourse),
	);
	const active = valid.find(
		(row) => row.locale === requested && row.locale !== base,
	);
	const copy = read(active, translatedCourse);
	const language = copy && active ? active.locale : base;
	const localizedCourse: Course = {
		...course,
		...copy,
		contentLanguage: language,
		availableContentLanguages: [
			...new Set([base, ...valid.map((row) => row.locale)]),
		],
	};
	const [sectionCopies, lessonCopies] = active
		? await Promise.all([
				rows<TranslationRow>(
					"SELECT t.section_id AS id,t.locale,t.source,t.payload FROM section_translations t JOIN sections s ON s.id=t.section_id WHERE s.course_id=? AND t.locale=?",
					course.id,
					language,
				),
				rows<TranslationRow>(
					"SELECT t.lesson_id AS id,t.locale,t.source,t.payload FROM lesson_translations t JOIN lessons l ON l.id=t.lesson_id JOIN sections s ON s.id=l.section_id WHERE s.course_id=? AND t.locale=?",
					course.id,
					language,
				),
			])
		: [[], []];
	return {
		course: localizedCourse,
		outline(sections: CourseResponse["sections"]): CourseResponse["sections"] {
			return sections.map((section) => {
				const row = sectionCopies.find((row) => row.id === section.id);
				const translated =
					row && sourceMatches(row.source, { title: section.title })
						? read(row, translatedSection)
						: null;
				return {
					...section,
					...translated,
					lessons: section.lessons.map((lesson) => {
						const row = lessonCopies.find((row) => row.id === lesson.id);
						let source: { title?: unknown; description?: unknown } | null =
							null;
						try {
							source = row ? JSON.parse(row.source) : null;
						} catch {
							/* Invalid snapshots fall back to original copy. */
						}
						const translated =
							source?.title === lesson.title &&
							source?.description === lesson.description
								? read(row, translatedLesson)
								: null;
						return {
							...lesson,
							title: translated?.title ?? lesson.title,
							description: translated?.description ?? lesson.description,
							contentLanguage: translated ? language : base,
						};
					}),
				};
			});
		},
		lesson(lesson: Lesson): Lesson {
			const row = lessonCopies.find((row) => row.id === lesson.id);
			const translated =
				row && sourceMatches(row.source, lessonSource(lesson))
					? read(row, translatedLesson)
					: null;
			if (
				!translated ||
				!activityTranslationMatches(
					lesson.activityConfig,
					translated.activityConfig,
				)
			)
				return { ...lesson, contentLanguage: base };
			return { ...lesson, ...translated, contentLanguage: language };
		},
	};
}
