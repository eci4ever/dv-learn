import { Link, useLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { localizedHref } from "../lib/seo";
import { getLocale } from "../paraglide/runtime.js";

// Public application pages use /$; Studio has its own protected route tree.
export function AppLink({
	href,
	...props
}: ComponentProps<"a"> & { href: string }) {
	const location = useLocation();
	const target = href.startsWith("#")
		? `${location.pathname}${location.searchStr}${href}`
		: href;
	const publicPage =
		target === "/" ||
		target.startsWith("/?") ||
		target.startsWith("/#") ||
		target.startsWith("/courses/");
	const [pathAndSearch, hash] = (
		publicPage ? localizedHref(target, getLocale()) : target
	).split("#");
	const [path, query] = pathAndSearch.split("?");
	const search =
		query !== undefined
			? Object.fromEntries(new URLSearchParams(query))
			: !path
				? true
				: undefined;
	const destination = path || location.pathname;
	if (destination === "/admin")
		return <Link {...props} to="/admin/courses" hash={hash} />;
	if (destination === "/")
		return (
			<Link
				{...props}
				to="/"
				hash={hash}
				search={search}
				activeOptions={{ includeSearch: false }}
			/>
		);
	return (
		<Link
			{...props}
			to="/$"
			params={{ _splat: destination.replace(/^\//, "") }}
			hash={hash}
			search={search}
		/>
	);
}
