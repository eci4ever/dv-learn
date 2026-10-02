import { createFileRoute } from "@tanstack/react-router";
import { LessonPage } from "../components/studio/lessons";
export const Route = createFileRoute(
	"/admin/courses/$courseId/lessons/$lessonId",
)({ component: LessonPage });
