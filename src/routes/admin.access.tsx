import { createFileRoute } from "@tanstack/react-router";
import { AccessPage } from "../components/studio/access";
export const Route = createFileRoute("/admin/access")({
	component: AccessPage,
});
