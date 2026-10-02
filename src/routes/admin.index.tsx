import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/")({
	beforeLoad: () => {
		throw redirect({ to: "/admin/courses", search: true, replace: true });
	},
});
