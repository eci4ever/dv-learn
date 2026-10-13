import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { courseSource, lessonSource } from "../lib/course-translation";
import {
	parseTranslation,
	saveTranslationInput,
	type TranslationRow,
	translationKey,
	translationKind,
	translationState,
} from "../lib/studio-translation";
import { adminMutation } from "./admin.server";
import { requireViewer } from "./auth";
import type { Course, Lesson, Section } from "./contracts";
import { courseColumns, lessonColumns, sectionColumns } from "./data";
import { runtime } from "./runtime";

const tables = {
	course: { table: "course_translations", column: "course_id" },
	section: { table: "section_translations", column: "section_id" },
	lesson: { table: "lesson_translations", column: "lesson_id" },
} as const;
const listInput = z.object({
	courseId: z.string().min(1).max(100),
	kind: translationKind.exclude(["course"]),
	page: z.number().int().min(1).max(100000).default(1),
	q: z.string().trim().max(200).default(""),
});

async function fingerprint(value: unknown) {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(JSON.stringify(value)),
	);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function record(input: z.infer<typeof translationKey>) {
	const db = runtime().db;
	const course = await db
		.prepare(`SELECT ${courseColumns} FROM courses WHERE id=?`)
		.bind(input.courseId)
		.first<Course>();
	if (!course) throw Error("TRANSLATION_NOT_FOUND");
	const locale: "en" | "ms" = course.contentLanguage === "ms" ? "en" : "ms";
	let source: Record<string, string | null>;
	let lessonType: Lesson["lessonType"] | undefined;
	let sharedLesson: Pick<
		Lesson,
		| "lessonType"
		| "activity"
		| "resourceLinks"
		| "videoUrl"
		| "durationSeconds"
		| "sectionId"
		| "sortOrder"
		| "published"
		| "preview"
	> | null = null;
	let guard: string;
	let params: (string | number | null)[];
	if (input.kind === "course") {
		if (input.id !== course.id) throw Error("TRANSLATION_NOT_FOUND");
		source = courseSource(course);
		guard =
			"EXISTS(SELECT 1 FROM courses WHERE id=? AND title=? AND description=? AND level=? AND content_language=?)";
		params = [
			course.id,
			course.title,
			course.description,
			course.level,
			course.contentLanguage ?? "en",
		];
	} else if (input.kind === "section") {
		const section = await db
			.prepare(
				`SELECT ${sectionColumns} FROM sections WHERE id=? AND course_id=?`,
			)
			.bind(input.id, course.id)
			.first<Section>();
		if (!section) throw Error("TRANSLATION_NOT_FOUND");
		source = { title: section.title };
		guard =
			"EXISTS(SELECT 1 FROM sections s JOIN courses c ON c.id=s.course_id WHERE s.id=? AND s.course_id=? AND s.title=? AND c.content_language=?)";
		params = [
			section.id,
			course.id,
			section.title,
			course.contentLanguage ?? "en",
		];
	} else {
		const lesson = await db
			.prepare(
				`SELECT ${lessonColumns} FROM lessons WHERE id=? AND section_id IN (SELECT id FROM sections WHERE course_id=?)`,
			)
			.bind(input.id, course.id)
			.first<Lesson>();
		if (!lesson) throw Error("TRANSLATION_NOT_FOUND");
		source = lessonSource(lesson);
		lessonType = lesson.lessonType;
		sharedLesson = {
			lessonType: lesson.lessonType,
			activity: lesson.activity,
			resourceLinks: lesson.resourceLinks,
			videoUrl: lesson.videoUrl,
			durationSeconds: lesson.durationSeconds,
			sectionId: lesson.sectionId,
			sortOrder: lesson.sortOrder,
			published: lesson.published,
			preview: lesson.preview,
		};
		guard =
			"EXISTS(SELECT 1 FROM lessons l JOIN sections s ON s.id=l.section_id JOIN courses c ON c.id=s.course_id WHERE l.id=? AND l.section_id=? AND s.course_id=? AND l.title=? AND l.description=? AND l.content=? AND l.activity_config IS ? AND l.lesson_type=? AND c.content_language=?)";
		params = [
			lesson.id,
			lesson.sectionId,
			course.id,
			lesson.title,
			lesson.description,
			lesson.content,
			lesson.activityConfig ?? null,
			lesson.lessonType,
			course.contentLanguage ?? "en",
		];
	}
	const { table, column } = tables[input.kind];
	const row = await db
		.prepare(
			`SELECT source,payload FROM ${table} WHERE ${column}=? AND locale=?`,
		)
		.bind(input.id, locale)
		.first<TranslationRow>();
	return {
		course,
		locale,
		source,
		lessonType,
		sharedLesson,
		guard,
		params,
		row,
		table,
		column,
	};
}

export const getAdminTranslation = createServerFn({ method: "GET" })
	.validator(translationKey)
	.handler(async ({ data: input }) => {
		await requireViewer(true);
		setResponseHeader("Cache-Control", "private, no-store");
		const current = await record(input);
		let payload = null;
		try {
			payload = current.row
				? parseTranslation(
						input.kind,
						JSON.parse(current.row.payload),
						{
							title: current.source.title ?? "",
							activityConfig: current.source.activityConfig,
						},
						current.lessonType,
					)
				: null;
		} catch {
			/* Invalid imports are editable, but never marked ready. */
		}
		return {
			...input,
			locale: current.locale,
			baseLocale: current.course.contentLanguage ?? "en",
			source: current.source,
			payload,
			status: translationState(
				input.kind,
				current.source,
				current.row,
				current.lessonType,
			),
			sourceVersion: await fingerprint({
				source: current.source,
				params: current.params,
			}),
			translationVersion: current.row ? await fingerprint(current.row) : null,
			lessonType: current.lessonType,
			sharedLesson: current.sharedLesson,
		};
	});

export const listAdminTranslations = createServerFn({ method: "GET" })
	.validator(listInput)
	.handler(async ({ data: input }) => {
		await requireViewer(true);
		setResponseHeader("Cache-Control", "private, no-store");
		const db = runtime().db;
		const course = await db
			.prepare("SELECT content_language AS language FROM courses WHERE id=?")
			.bind(input.courseId)
			.first<{ language: "en" | "ms" }>();
		if (!course) throw Error("TRANSLATION_NOT_FOUND");
		const locale = course.language === "ms" ? "en" : "ms";
		const section = input.kind === "section";
		const from = section
			? "sections e"
			: "lessons e JOIN sections s ON s.id=e.section_id";
		const parent = section ? "e.course_id" : "s.course_id";
		const { table, column } = tables[input.kind];
		const q = `%${input.q.replace(/[\\%_]/g, "\\$&")}%`;
		const where = `${parent}=? AND e.title LIKE ? ESCAPE '\\'`;
		const [count, rows] = await Promise.all([
			db
				.prepare(`SELECT COUNT(*) AS total FROM ${from} WHERE ${where}`)
				.bind(input.courseId, q)
				.first<{ total: number }>(),
			db
				.prepare(
					`SELECT e.id,e.title,${section ? "NULL AS description,NULL AS content,NULL AS activityConfig,NULL AS lessonType" : "e.description,e.content,e.activity_config AS activityConfig,e.lesson_type AS lessonType"},t.source AS translatedSource,t.payload AS translatedPayload FROM ${from} LEFT JOIN ${table} t ON t.${column}=e.id AND t.locale=? WHERE ${where} ORDER BY ${section ? "e.sort_order,e.id" : "s.sort_order,e.sort_order,e.id"} LIMIT 20 OFFSET ?`,
				)
				.bind(locale, input.courseId, q, (input.page - 1) * 20)
				.all<{
					id: string;
					title: string;
					description: string;
					content: string;
					activityConfig: string | null;
					lessonType: string;
					translatedSource: string | null;
					translatedPayload: string | null;
				}>(),
		]);
		return {
			page: input.page,
			pageSize: 20,
			total: count?.total ?? 0,
			items: rows.results.map((row) => ({
				id: row.id,
				title: row.title,
				status: translationState(
					input.kind,
					section ? { title: row.title } : lessonSource(row),
					row.translatedSource && row.translatedPayload
						? { source: row.translatedSource, payload: row.translatedPayload }
						: null,
					row.lessonType,
				),
			})),
		};
	});

export const saveAdminTranslation = createServerFn({ method: "POST" })
	.validator(saveTranslationInput)
	.handler(async ({ data: input }) => {
		const db = await adminMutation();
		const current = await record(input);
		if (
			input.sourceVersion !==
				(await fingerprint({
					source: current.source,
					params: current.params,
				})) ||
			input.translationVersion !==
				(current.row ? await fingerprint(current.row) : null)
		)
			throw Error("TRANSLATION_CONFLICT");
		const payload = parseTranslation(
			input.kind,
			input.payload,
			{
				title: current.source.title ?? "",
				activityConfig: current.source.activityConfig,
			},
			current.lessonType,
		);
		const previous = current.row;
		const revisionGuard = previous
			? `EXISTS(SELECT 1 FROM ${current.table} WHERE ${current.column}=? AND locale=? AND source=? AND payload=?)`
			: `NOT EXISTS(SELECT 1 FROM ${current.table} WHERE ${current.column}=? AND locale=?)`;
		// The source and existing translation are compared again inside the write.
		// This prevents a concurrent edit between the read and the upsert being lost.
		const result = await db
			.prepare(
				`INSERT INTO ${current.table}(${current.column},locale,source,payload) SELECT ?,?,?,? WHERE ${current.guard} AND ${revisionGuard} ON CONFLICT(${current.column},locale) DO UPDATE SET source=excluded.source,payload=excluded.payload`,
			)
			.bind(
				input.id,
				current.locale,
				JSON.stringify(current.source),
				JSON.stringify(payload),
				...current.params,
				input.id,
				current.locale,
				...(previous ? [previous.source, previous.payload] : []),
			)
			.run();
		if (!result.meta.changes) throw Error("TRANSLATION_CONFLICT");
		return { id: input.id };
	});
