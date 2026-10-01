import { createFileRoute } from "@tanstack/react-router";
import { courses } from "../server/data";
import { runtime } from "../server/runtime";
export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				const origin = new URL(runtime().env.BETTER_AUTH_URL).origin;
				const paths = [
					"/",
					...(await courses()).map(
						(course) => `/courses/${encodeURIComponent(course.slug)}`,
					),
				];
				const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${origin.replace(/&/g, "&amp;")}${path}</loc></url>`).join("")}</urlset>`;
				return new Response(xml, {
					headers: {
						"Content-Type": "application/xml",
						"Cache-Control": "public,max-age=300",
					},
				});
			},
		},
	},
});
