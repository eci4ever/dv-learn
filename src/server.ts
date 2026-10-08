import handler from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "./paraglide/server.js";

export default {
	fetch(request: Request) {
		return paraglideMiddleware(
			request,
			async ({ request: localizedRequest, locale }) => {
				const response = await handler.fetch(localizedRequest);
				if (!response.headers.get("content-type")?.includes("text/html"))
					return response;
				const headers = new Headers(response.headers);
				headers.append("Vary", "Cookie");
				headers.set("Content-Language", locale);
				headers.set("Cache-Control", "private, no-store");
				return new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers,
				});
			},
		);
	},
};
