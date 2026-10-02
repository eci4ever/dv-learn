import { createFileRoute } from "@tanstack/react-router";
import { PlatformPage } from "../components/platform";
import { guardPlatformRoute } from "../lib/platform-guard";
import { getCourse } from "../server/functions";
export const Route = createFileRoute("/$")({
	beforeLoad: ({ location }) => guardPlatformRoute(location.pathname),
	loader: async ({ location }) => {
		const parts = location.pathname.split("/").filter(Boolean);
		if (parts[0] === "courses" && parts.length === 2) {
			try {
				const result = await getCourse({ data: { slug: parts[1] } });
				return {
					title: result.course.title,
					description: result.course.description,
					public: true,
				};
			} catch {
				return {
					title: "Kursus tidak ditemui",
					description: "",
					public: false,
				};
			}
		}
		return {
			title: "Ruang pembelajaran",
			description: "Ruang pembelajaran anda.",
			public: false,
		};
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: loaderData ? `${loaderData.title} — DV Learn` : "DV Learn" },
			{ name: "description", content: loaderData?.description ?? "" },
			...(loaderData?.public
				? []
				: [{ name: "robots", content: "noindex, nofollow" }]),
		],
	}),
	component: PlatformPage,
});
