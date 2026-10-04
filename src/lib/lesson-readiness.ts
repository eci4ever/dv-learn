import type { LessonInput } from "../server/contracts";
import { youtubeId } from "./youtube";

export function lessonIssues(
	lesson: Pick<
		LessonInput,
		"lessonType" | "activity" | "title" | "content" | "videoUrl"
	>,
): string[] {
	const issues: string[] = [];
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
		!["ipv4", "private", "subnet"].includes(lesson.activity ?? "")
	)
		issues.push("Choose an interactive activity.");
	if (lesson.lessonType === "quiz" && lesson.activity !== "quiz")
		issues.push("Choose a quiz activity.");
	return issues;
}
