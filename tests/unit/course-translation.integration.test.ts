import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Viewer } from "../../src/server/contracts";
import { sqliteD1 } from "./sqlite-d1";

const state = vi.hoisted(() => ({
	runtime: null as unknown,
	locale: "en" as "en" | "ms",
	user: null as Viewer | null,
}));
vi.mock("../../src/server/runtime", () => ({ runtime: () => state.runtime }));
vi.mock("../../src/paraglide/runtime.js", () => ({
	getLocale: () => state.locale,
}));
vi.mock("../../src/server/auth", () => ({
	viewer: async () => state.user,
	requireViewer: async () => {
		if (!state.user?.emailVerified) throw Error("Verified login required");
		return state.user;
	},
	requireSameOrigin: vi.fn(),
	auth: vi.fn(),
}));
vi.mock("../../src/server/payments", () => ({
	createCheckout: vi.fn(),
	reconcilePayment: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		const builder = {
			validator: () => builder,
			handler: (handler: unknown) => handler,
		};
		return builder;
	},
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: vi.fn() }));

import { courseSource, lessonSource } from "../../src/lib/course-translation";
import {
	enrollFree,
	getCatalog,
	getCourse,
	getDashboard,
	getLesson,
	saveProgress,
} from "../../src/server/functions";

const read = (file: string) =>
	JSON.parse(
		readFileSync(
			new URL(`../../courses/dns-fundamentals/${file}`, import.meta.url),
			"utf8",
		),
	);
const en = read("course.json"),
	ms = read("course.ms.json");
let fixture: ReturnType<typeof sqliteD1>;
beforeEach(() => {
	fixture = sqliteD1();
	state.runtime = { db: fixture.db };
	state.locale = "en";
	state.user = null;
	fixture.sqlite.exec(
		"INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('student','Student','student@example.test',1,0,0)",
	);
	fixture.sqlite
		.prepare(
			"INSERT INTO courses(id,slug,title,description,level,published,free_enrollment) VALUES (?,?,?,?,?,1,1)",
		)
		.run(
			en.course.id,
			en.course.slug,
			en.course.title,
			en.course.description,
			en.course.level,
		);
	fixture.sqlite
		.prepare(
			"INSERT INTO course_translations(course_id,locale,source,payload) VALUES (?,'ms',?,?)",
		)
		.run(
			en.course.id,
			JSON.stringify(courseSource(en.course)),
			JSON.stringify({
				title: ms.course.title,
				description: ms.course.description,
				level: ms.course.level,
			}),
		);
	for (const [index, section] of en.sections.entries()) {
		fixture.sqlite
			.prepare(
				"INSERT INTO sections(id,course_id,title,sort_order) VALUES (?,?,?,?)",
			)
			.run(section.id, en.course.id, section.title, index);
		fixture.sqlite
			.prepare(
				"INSERT INTO section_translations(section_id,locale,source,payload) VALUES (?,'ms',?,?)",
			)
			.run(
				section.id,
				JSON.stringify({ title: section.title }),
				JSON.stringify({ title: ms.sections[index].title }),
			);
	}
	for (const [index, lesson] of en.lessons.entries()) {
		const config = lesson.config ? JSON.stringify(lesson.config) : null;
		fixture.sqlite
			.prepare(
				"INSERT INTO lessons(id,section_id,title,description,content,lesson_type,activity_config,preview,published,sort_order) VALUES (?,?,?,?,?,?,?,1,1,?)",
			)
			.run(
				lesson.id,
				lesson.sectionId,
				lesson.title,
				lesson.description,
				lesson.content,
				lesson.lessonType,
				config,
				index,
			);
		const translated = ms.lessons[index];
		fixture.sqlite
			.prepare(
				"INSERT INTO lesson_translations(lesson_id,locale,source,payload) VALUES (?,'ms',?,?)",
			)
			.run(
				lesson.id,
				JSON.stringify(lessonSource({ ...lesson, activityConfig: config })),
				JSON.stringify({
					title: translated.title,
					description: translated.description,
					content: translated.content,
					activityConfig: translated.config
						? JSON.stringify(translated.config)
						: null,
				}),
			);
	}
});
afterEach(() => fixture.sqlite.close());
it("serves requested copy on the same IDs and advertises both languages without exposing bodies in catalog/outline", async () => {
	const english = await getLesson({
		data: { courseSlug: en.course.slug, lessonId: en.lessons[0].id },
	});
	expect(english.lesson.contentLanguage).toBe("en");
	expect(english.course.availableContentLanguages).toEqual(["en", "ms"]);
	state.locale = "ms";
	const malay = await getLesson({
		data: { courseSlug: en.course.slug, lessonId: en.lessons[0].id },
	});
	expect(malay.lesson.id).toBe(english.lesson.id);
	expect(malay.lesson.content).toBe(ms.lessons[0].content);
	expect(malay.lesson.contentLanguage).toBe("ms");
	expect((await getCatalog()).courses[0].title).toBe("Asas DNS");
	const overview = await getCourse({ data: { slug: en.course.slug } });
	expect(overview.sections[0].lessons[0].title).toBe(ms.lessons[0].title);
	expect(overview.sections[0].lessons[0]).not.toHaveProperty("content");
	expect(overview.sections[0].lessons[0]).not.toHaveProperty("activityConfig");
});
it("shares enrollment, completion and resume across languages", async () => {
	state.user = {
		id: "student",
		name: "Student",
		email: "student@example.test",
		emailVerified: true,
		role: "student",
	};
	await enrollFree({ data: { slug: en.course.slug } });
	await saveProgress({
		data: { lessonId: en.lessons[0].id, positionSeconds: 0, completed: true },
	});
	state.locale = "ms";
	expect(
		(
			await getLesson({
				data: { courseSlug: en.course.slug, lessonId: en.lessons[0].id },
			})
		).progress?.completed,
	).toBe(true);
	const dashboard = await getDashboard();
	expect(dashboard.courses[0].title).toBe("Asas DNS");
	expect(dashboard.courses[0].nextLessonId).toBe(en.lessons[1].id);
	expect(dashboard.courses[0].nextLessonTitle).toBe(ms.lessons[1].title);
	expect(
		fixture.sqlite
			.prepare("SELECT count(*) AS count FROM free_enrollments")
			.get()?.count,
	).toBe(1);
});
it("keeps locked and draft translation bodies behind the original access gate", async () => {
	state.locale = "ms";
	fixture.sqlite.exec("UPDATE lessons SET preview=0 WHERE id='dns-names-url'");
	await expect(
		getLesson({
			data: { courseSlug: en.course.slug, lessonId: en.lessons[0].id },
		}),
	).rejects.toThrow("Purchase");
	fixture.sqlite.exec(
		"UPDATE lessons SET published=0 WHERE id='dns-names-url'",
	);
	await expect(
		getLesson({
			data: { courseSlug: en.course.slug, lessonId: en.lessons[0].id },
		}),
	).rejects.toThrow("Lesson not found");
	expect(
		(await getCourse({ data: { slug: en.course.slug } })).sections
			.flatMap((s) => s.lessons)
			.some((lesson) => lesson.id === "dns-names-url"),
	).toBe(false);
});
it("falls back accurately when source copy changes or a translation attempts to change grading", async () => {
	state.locale = "ms";
	fixture.sqlite.exec(
		"UPDATE lessons SET content='Updated English source' WHERE id='dns-names-url'",
	);
	const stale = await getLesson({
		data: { courseSlug: en.course.slug, lessonId: en.lessons[0].id },
	});
	expect(stale.lesson.contentLanguage).toBe("en");
	expect(stale.lesson.content).toBe("Updated English source");
	const translated = structuredClone(ms.lessons[5]);
	translated.config.questions[0].answerId = "A";
	fixture.sqlite
		.prepare(
			"UPDATE lesson_translations SET payload=? WHERE lesson_id='dns-self-check'",
		)
		.run(
			JSON.stringify({
				title: translated.title,
				description: translated.description,
				content: translated.content,
				activityConfig: JSON.stringify(translated.config),
			}),
		);
	const tampered = await getLesson({
		data: { courseSlug: en.course.slug, lessonId: "dns-self-check" },
	});
	expect(tampered.lesson.contentLanguage).toBe("en");
	expect(
		JSON.parse(tampered.lesson.activityConfig ?? "{}").questions[0].answerId,
	).toBe("B");
	fixture.sqlite.exec(
		"UPDATE courses SET description='New course description'",
	);
	expect(
		(await getCourse({ data: { slug: en.course.slug } })).course
			.availableContentLanguages,
	).toEqual(["en"]);
});
