import { expect, it } from "vitest";
import type { Progress } from "../server/contracts";
import { learningProgress } from "./learning-progress";

const lessons = [
	{ id: "first", title: "First lesson" },
	{ id: "second", title: "Second lesson" },
];
const progress = (
	lessonId: string,
	completed: boolean,
	updatedAt: number,
): Progress => ({ lessonId, completed, updatedAt, positionSeconds: 0 });

it("starts at the first lesson with no learning history", () => {
	expect(learningProgress(lessons, [])).toMatchObject({
		nextLessonId: "first",
		nextLessonTitle: "First lesson",
		progressPercent: 0,
		lastStudiedAt: null,
	});
});
it("resumes the most recently studied unfinished lesson", () => {
	expect(
		learningProgress(lessons, [
			progress("first", false, 1),
			progress("second", false, 2),
		]),
	).toMatchObject({ nextLessonId: "second", lastStudiedAt: 2 });
});
it("moves on from completed lessons and ignores unrelated or unpublished history", () => {
	expect(
		learningProgress(lessons, [
			progress("first", true, 3),
			progress("hidden", true, 99),
			progress("other-course", false, 100),
		]),
	).toMatchObject({
		completedLessonIds: ["first"],
		completedLessons: 1,
		progressPercent: 50,
		nextLessonId: "second",
		lastStudiedAt: 3,
	});
});
it("finishes a course without offering a nonexistent next lesson", () => {
	expect(
		learningProgress(
			lessons,
			lessons.map((lesson) => progress(lesson.id, true, 10)),
		),
	).toMatchObject({
		nextLessonId: null,
		nextLessonTitle: null,
		progressPercent: 100,
	});
});
it("handles an empty course", () => {
	expect(learningProgress([], [progress("hidden", true, 1)])).toMatchObject({
		totalLessons: 0,
		progressPercent: 0,
		completedLessons: 0,
		lastStudiedAt: null,
		nextLessonId: null,
	});
});
