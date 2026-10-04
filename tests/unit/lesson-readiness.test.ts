import { expect, it } from "vitest";
import { lessonIssues } from "../../src/lib/lesson-readiness";
import { publishableLessonInput } from "../../src/server/validation";

const draft = {
	title: "Lesson",
	sectionId: "section",
	description: "",
	content: "",
	videoUrl: null,
	resourceLinks: "",
	durationSeconds: 0,
	sortOrder: 0,
	preview: false,
	published: false,
	lessonType: "reading" as const,
	activity: null,
};
it("allows incomplete drafts but rejects empty published reading lessons", () => {
	expect(publishableLessonInput.safeParse(draft).success).toBe(true);
	expect(
		publishableLessonInput.safeParse({ ...draft, published: true }).success,
	).toBe(false);
	expect(
		publishableLessonInput.safeParse({
			...draft,
			content: "Read this",
			published: true,
		}).success,
	).toBe(true);
});
it("requires video content and the correct activity for each type", () => {
	expect(lessonIssues({ ...draft, lessonType: "video" })).toEqual([
		"Add a valid YouTube video.",
	]);
	expect(
		lessonIssues({
			...draft,
			lessonType: "video",
			videoUrl: "https://www.youtube.com/watch?v=abcdefghijk",
		}),
	).toEqual([]);
	expect(
		lessonIssues({ ...draft, lessonType: "interactive", activity: "subnet" }),
	).toEqual([]);
	expect(
		lessonIssues({ ...draft, lessonType: "interactive", activity: "quiz" }),
	).toEqual(["Choose an interactive activity."]);
	expect(
		lessonIssues({ ...draft, lessonType: "quiz", activity: "ipv4" }),
	).toEqual(["Choose a quiz activity."]);
	expect(
		lessonIssues({ ...draft, lessonType: "quiz", activity: "quiz" }),
	).toEqual([]);
});
