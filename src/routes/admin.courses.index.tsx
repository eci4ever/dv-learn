import { createFileRoute } from "@tanstack/react-router";
import { CoursesPage } from "../components/studio/courses";
export const Route = createFileRoute("/admin/courses/")({
	component: CoursesPage,
});
