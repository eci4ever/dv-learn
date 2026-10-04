import { lessonIssues } from "../lib/lesson-readiness";
import type { CourseInput, Lesson } from "./contracts";
import { lessonColumns } from "./data";
import { runtime } from "./runtime";

export async function courseReadiness(course: CourseInput) {
	const db = runtime().db;
	const lessons = course.id
		? (
				await db
					.prepare(
						`SELECT ${lessonColumns} FROM lessons WHERE section_id IN (SELECT id FROM sections WHERE course_id=?) AND published=1`,
					)
					.bind(course.id)
					.all<Lesson>()
			).results
		: [];
	const product = course.id
		? await db
				.prepare(
					"SELECT 1 FROM product_courses pc JOIN products p ON p.id=pc.product_id WHERE pc.course_id=? AND p.active=1 LIMIT 1",
				)
				.bind(course.id)
				.first()
		: null;
	const issues: string[] = [];
	if (!course.title.trim()) issues.push("Add a course title.");
	if (!course.description.trim()) issues.push("Add a course description.");
	if (course.archived) issues.push("Unarchive this course before publishing.");
	if (!lessons.length) issues.push("Publish at least one lesson.");
	for (const lesson of lessons)
		for (const issue of lessonIssues(lesson))
			issues.push(`${lesson.title}: ${issue}`);
	return {
		issues,
		publishedLessons: lessons.length,
		access:
			lessons.length && lessons.every((lesson) => lesson.preview)
				? "Free course: every published lesson is a public preview. Practice progress still requires an account with course access."
				: product
					? "Paid course: an active product provides access. Free-preview lessons remain public."
					: "Manual access only: grant access in Studio, or link an active product to sell this course.",
	};
}
