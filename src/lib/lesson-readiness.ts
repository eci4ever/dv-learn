import type { LessonInput } from "../server/contracts";
import { activityIssues, parseActivity } from "./lesson-activity.ts";
import { youtubeId } from "./youtube.ts";

export function lessonIssues(
	lesson: Pick<
		LessonInput,
		| "lessonType"
		| "activity"
		| "title"
		| "content"
		| "videoUrl"
		| "activityConfig"
	>,
): string[] {
	const issues: string[] = activityIssues(lesson);
	const configured = parseActivity(lesson.activityConfig);
	if (!lesson.title.trim()) issues.push("Add a lesson title.");
	if (
		lesson.lessonType === "video" &&
		(!lesson.videoUrl || !youtubeId(lesson.videoUrl))
	)
		issues.push("Add a valid YouTube video.");
	if (lesson.lessonType === "reading" && !lesson.content.trim())
		issues.push("Add reading content.");
	if (
		lesson.lessonType === "interactive" &&
		!configured &&
		!["ipv4", "private", "subnet"].includes(lesson.activity ?? "")
	)
		issues.push("Choose an interactive activity.");
	if (lesson.lessonType === "quiz" && !configured && lesson.activity !== "quiz")
		issues.push("Choose a quiz activity.");
	return issues;
}
