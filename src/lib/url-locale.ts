import {
	defineCustomClientStrategy,
	defineCustomServerStrategy,
} from "../paraglide/runtime.js";
import { localeFromUrl } from "./seo";

// An explicit shareable URL takes precedence over the saved preference.
defineCustomServerStrategy("custom-query", {
	getLocale: (request) => (request ? localeFromUrl(request.url) : undefined),
});
defineCustomClientStrategy("custom-query", {
	getLocale: () =>
		typeof window === "undefined"
			? undefined
			: localeFromUrl(window.location.href),
	setLocale: (locale) => {
		const url = new URL(window.location.href);
		url.searchParams.set("lang", locale);
		window.history.replaceState(window.history.state, "", url);
	},
});
