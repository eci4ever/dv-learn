import { createFileRoute } from "@tanstack/react-router";
import { OperationsPage } from "../components/studio/operations";
export const Route = createFileRoute("/admin/operations")({
	component: OperationsPage,
});
