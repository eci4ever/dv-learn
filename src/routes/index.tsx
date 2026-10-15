import { createFileRoute } from "@tanstack/react-router";
import { Catalog } from "../components/platform";
import { jsonLd, publicHead, siteOrigin } from "../lib/seo";
import * as m from "../paraglide/messages.js";
import { getLocale } from "../paraglide/runtime.js";
import { getCatalog } from "../server/functions";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		try {
			await context.queryClient.fetchQuery({
				queryKey: ["catalog", getLocale()],
				queryFn: () => getCatalog(),
				retry: false,
			});
		} catch (error) {
			// Initial HTML must report server failures; client navigation keeps the catalog's retry UI.
			if (typeof window === "undefined") throw error;
		}
	},
	head: () => ({
		...publicHead({
			title: m.site_title(),
			description:
				getLocale() === "ms"
					? "Belajar melalui kursus interaktif dalam BM dan English. Terokai asas komputer dan networking, cuba latihan praktikal dan belajar mengikut rentak anda."
					: "Learn with interactive courses in English and Bahasa Melayu. Explore computing and networking fundamentals, practise new skills and learn at your own pace.",
			path: "/",
			locale: getLocale(),
		}),
		scripts: [
			{
				type: "application/ld+json",
				children: jsonLd({
					"@context": "https://schema.org",
					"@type": "WebSite",
					name: "DV Learn",
					url: siteOrigin,
					inLanguage: ["en", "ms"],
				}),
			},
		],
	}),
	component: Catalog,
});
