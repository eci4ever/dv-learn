import { createFileRoute } from "@tanstack/react-router";
import { auth, requireViewer } from "../../../server/auth";

async function handle(request: Request) {
	if (new URL(request.url).pathname.startsWith("/api/auth/admin/")) {
		try {
			await requireViewer(true);
		} catch {
			return Response.json(
				{ message: "Administrator permission is required." },
				{ status: 403 },
			);
		}
	}
	return auth().handler(request);
}
export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => handle(request),
			POST: ({ request }) => handle(request),
		},
	},
});
