import { createFileRoute } from "@tanstack/react-router";
import { PlatformPage } from "../components/platform";
import { guardPlatformRoute } from "../lib/platform-guard";
import * as m from "../paraglide/messages.js";
import { getCourse } from "../server/functions";
export const Route = createFileRoute("/$")({
	beforeLoad: ({ location }) => guardPlatformRoute(location.pathname),
	loader: async ({ location }) => {
		const parts = location.pathname.split("/").filter(Boolean);
		if (parts[0] === "dashboard") {
			return {
				title: m.my_learning(),
				description: m.pick_up_learning(),
				public: false,
			};
		}
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
					title: m.learner_course_not_found(),
					description: "",
					public: false,
				};
			}
		}
		return {
			title: m.learner_learning_space(),
			description: m.learner_your_learning_space(),
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
