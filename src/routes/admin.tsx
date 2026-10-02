import { createFileRoute } from "@tanstack/react-router";
import { StudioLayout } from "../components/studio/layout";
import { guardPlatformRoute } from "../lib/platform-guard";
import { parseStudioSearch } from "../server/studio";
export const Route = createFileRoute("/admin")({
	beforeLoad: ({ location }) => guardPlatformRoute(location.pathname),
	validateSearch: parseStudioSearch,
	head: () => ({
		meta: [
			{ title: "Studio Admin — DV Learn" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: StudioLayout,
});
