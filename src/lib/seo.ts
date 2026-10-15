export const siteOrigin = "https://learn.nimfi.dev";
export type SiteLocale = "en" | "ms";

export function localeFromUrl(url: string): SiteLocale | undefined {
	const locale = new URL(url, siteOrigin).searchParams.get("lang");
	return locale === "en" || locale === "ms" ? locale : undefined;
}

export function localizedHref(href: string, locale: string) {
	const url = new URL(href, siteOrigin);
	url.searchParams.set("lang", locale);
	return `${url.pathname}${url.search}${url.hash}`;
}

export function publicHead({
	title,
	description,
	path,
	locale,
	languages = ["en", "ms"],
	course = false,
}: {
	title: string;
	description: string;
	path: string;
	locale: SiteLocale;
	languages?: SiteLocale[];
	course?: boolean;
}) {
	const url = siteOrigin + localizedHref(path, locale);
	const summary = description.replace(/\s+/g, " ").trim();
	return {
		meta: [
			{ title },
			{ name: "description", content: summary },
			{ name: "robots", content: "index, follow" },
			{ property: "og:type", content: course ? "article" : "website" },
			{ property: "og:site_name", content: "DV Learn" },
			{ property: "og:title", content: title },
			{ property: "og:description", content: summary },
			{ property: "og:url", content: url },
			{ property: "og:locale", content: locale === "ms" ? "ms_MY" : "en_MY" },
			{ property: "og:image", content: `${siteOrigin}/social-card.png` },
			{
				property: "og:image:alt",
				content: "DV Learn — Learn at your own pace",
			},
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: summary },
			{ name: "twitter:image", content: `${siteOrigin}/social-card.png` },
		],
		links: [
			{ rel: "canonical", href: url },
			...languages.map((language) => ({
				rel: "alternate",
				hrefLang: language,
				href: siteOrigin + localizedHref(path, language),
			})),
			{
				rel: "alternate",
				hrefLang: "x-default",
				href:
					siteOrigin +
					localizedHref(path, languages.includes("en") ? "en" : languages[0]),
			},
		],
	};
}

export function jsonLd(value: unknown) {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}
