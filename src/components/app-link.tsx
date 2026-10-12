import { Link, useLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";

// Public application pages use /$; Studio has its own protected route tree.
export function AppLink({
	href,
	...props
}: ComponentProps<"a"> & { href: string }) {
	const [pathAndSearch, hash] = href.split("#");
	const [path, query] = pathAndSearch.split("?");
	const search =
		query !== undefined
			? Object.fromEntries(new URLSearchParams(query))
			: !path
				? true
				: undefined;
	const pathname = useLocation({ select: (location) => location.pathname });
	const destination = path || pathname;
	if (destination === "/admin")
		return <Link {...props} to="/admin/courses" hash={hash} />;
	if (destination === "/")
		return <Link {...props} to="/" hash={hash} search={search} />;
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
