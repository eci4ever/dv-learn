import { createFileRoute } from "@tanstack/react-router";
import { SectionPage } from "../components/studio/sections";
export const Route = createFileRoute(
	"/admin/courses/$courseId/sections/$sectionId",
)({ component: SectionPage });
