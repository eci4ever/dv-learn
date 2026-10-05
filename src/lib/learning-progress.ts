import type { Progress } from "../server/contracts";

/** Only lessons visible in this course count toward progress or resuming. */
export function learningProgress<T extends { id: string; title: string }>(
	lessons: T[],
	progress: Progress[],
) {
	const ids = new Set(lessons.map((lesson) => lesson.id));
	const visible = progress.filter((item) => ids.has(item.lessonId));
	const completedLessonIds = [
		...new Set(
			visible.filter((item) => item.completed).map((item) => item.lessonId),
		),
	];
	const completed = new Set(completedLessonIds);
	const recent = visible
		.filter((item) => !completed.has(item.lessonId))
		.sort((a, b) => b.updatedAt - a.updatedAt)[0];
	const nextLesson =
		lessons.find((lesson) => lesson.id === recent?.lessonId) ??
		lessons.find((lesson) => !completed.has(lesson.id)) ??
		null;
	return {
		totalLessons: lessons.length,
		completedLessons: completed.size,
		completedLessonIds,
		progressPercent: lessons.length
			? Math.round((completed.size / lessons.length) * 100)
			: 0,
		nextLessonId: nextLesson?.id ?? null,
		nextLessonTitle: nextLesson?.title ?? null,
		lastStudiedAt: visible.length
			? visible.reduce((latest, item) => Math.max(latest, item.updatedAt), 0)
			: null,
	};
}
