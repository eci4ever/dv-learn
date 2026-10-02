import { createFileRoute } from "@tanstack/react-router";
import { CoursePage } from "../components/studio/courses";
export const Route = createFileRoute("/admin/courses/$courseId")({
	component: CoursePage,
});
