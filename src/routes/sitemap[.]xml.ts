import { createFileRoute } from "@tanstack/react-router";
import { localizedHref, siteOrigin } from "../lib/seo";
import { courses } from "../server/data";
import { translatedCatalog } from "../server/learning-translations";
export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				const origin = siteOrigin;
				const paths = [
					localizedHref("/", "en"),
					localizedHref("/", "ms"),
					...(await translatedCatalog(await courses())).flatMap((course) =>
						course.availableContentLanguages.map((locale) =>
							localizedHref(
								`/courses/${encodeURIComponent(course.slug)}`,
								locale,
							),
						),
					),
				];
				const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${(origin + path).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</loc></url>`).join("")}</urlset>`;
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
