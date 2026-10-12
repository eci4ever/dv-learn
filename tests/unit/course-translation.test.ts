import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
	activityTranslationMatches,
	sourceMatches,
	translatedLesson,
} from "../../src/lib/course-translation";
import { learningHeading } from "../../src/lib/learning-text";
import {
	activitySchema,
	cacheRun,
	quizResults,
	recordFeedback,
} from "../../src/lib/lesson-activity";
import { lessonSections } from "../../src/lib/lesson-copy";

const read = (file: string) =>
	JSON.parse(
		readFileSync(
			new URL(`../../courses/dns-fundamentals/${file}`, import.meta.url),
			"utf8",
		),
	);
const en = read("course.json"),
	ms = read("course.ms.json");
it("preserves every lesson ID, source, time estimate and grading rule in BM", () => {
	expect(ms.course.id).toBe(en.course.id);
	expect(ms.course.slug).toBe(en.course.slug);
	expect(ms.course.contentLanguage).toBe("ms");
	expect(ms.lessons).toHaveLength(6);
	for (const [index, lesson] of ms.lessons.entries()) {
		const original = en.lessons[index];
		expect([
			lesson.id,
			lesson.sectionId,
			lesson.minutes,
			lesson.lessonType,
			lesson.sources,
		]).toEqual([
			original.id,
			original.sectionId,
			original.minutes,
			original.lessonType,
			original.sources,
		]);
		expect(
			activityTranslationMatches(
				original.config ? JSON.stringify(original.config) : null,
				lesson.config ? JSON.stringify(lesson.config) : null,
			),
		).toBe(true);
		expect(lesson.content).not.toBe(original.content);
	}
});
it("retains self-check disclosure and semantic reading sections in BM", () => {
	for (const id of ["dns-names-url", "dns-troubleshoot"]) {
		const sections = lessonSections(
			ms.lessons.find((lesson: { id: string }) => lesson.id === id).content,
		);
		expect(
			sections.some(
				(section) => section.heading === "Self-check — read after practising",
			),
		).toBe(true);
		expect(sections.some((section) => section.heading === "Recap")).toBe(true);
	}
	expect(learningHeading("Explain", "ms")).toBe("Penerangan");
	expect(learningHeading("Recap", "ms")).toBe("Ringkasan");
});
it("rejects changed answer keys, simulation values, types and protected payload fields", () => {
	for (const lesson of en.lessons.filter(
		(lesson: { config?: unknown }) => lesson.config,
	)) {
		const config = structuredClone(lesson.config);
		if (config.kind === "practice-quiz") config.questions[0].answerId = "A";
		else if (config.kind === "dns-records")
			config.tasks[0].expected.value = "192.0.2.99";
		else if (config.kind === "dns-resolution") config.coldSteps[0].to = "root";
		else config.ttlSeconds = 600;
		expect(
			activityTranslationMatches(
				JSON.stringify(lesson.config),
				JSON.stringify(config),
			),
		).toBe(false);
	}
	expect(
		translatedLesson.safeParse({
			title: "BM",
			description: "",
			content: "",
			activityConfig: null,
			preview: true,
		}).success,
	).toBe(false);
	expect(sourceMatches('{"title":"Original"}', { title: "Changed" })).toBe(
		false,
	);
	expect(sourceMatches("null", { title: "Original" })).toBe(false);
});
it("keeps BM feedback, full quiz scoring and exact cache boundaries", () => {
	const record = activitySchema.parse(ms.lessons[2].config);
	if (record.kind !== "dns-records") throw Error("Expected records");
	expect(
		recordFeedback(
			record.tasks[0],
			{ owner: "wrong.example", type: "A", value: "wrong", preference: "" },
			"ms",
		).join(" "),
	).toContain("Gunakan owner name app.example.com");
	expect(
		recordFeedback(
			record.tasks[0],
			{
				owner: record.tasks[0].owner,
				type: "A",
				value: record.tasks[0].expected.value,
				preference: "",
			},
			"ms",
		),
	).toEqual([]);
	const quiz = activitySchema.parse(ms.lessons[5].config);
	if (quiz.kind !== "practice-quiz") throw Error("Expected quiz");
	expect(
		quizResults(
			quiz,
			Object.fromEntries(quiz.questions.map((q) => [q.id, q.answerId])),
		).filter((r) => r.correct),
	).toHaveLength(8);
	const cache = activitySchema.parse(ms.lessons[3].config);
	if (cache.kind !== "dns-cache") throw Error("Expected cache");
	expect(cacheRun(cache).map((r) => [r.address, r.ttl])).toEqual([
		["192.0.2.10", 180],
		["192.0.2.10", 1],
		["192.0.2.20", 300],
		["192.0.2.20", 299],
	]);
});
