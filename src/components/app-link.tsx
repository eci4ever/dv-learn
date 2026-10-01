import { Link, useLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";

// The platform currently routes application pages through /$.
// Preserve anchor composition for Base UI while delegating navigation to Router.
export function AppLink({
	href,
	...props
}: ComponentProps<"a"> & { href: string }) {
	const [path, hash] = href.split("#");
	const pathname = useLocation({ select: (location) => location.pathname });
	const destination = path || pathname;
	if (destination === "/")
		return (
			<Link {...props} to="/" hash={hash} search={!path ? true : undefined} />
		);
	return (
		<Link
			{...props}
			to="/$"
			params={{ _splat: destination.replace(/^\//, "") }}
			hash={hash}
			search={!path ? true : undefined}
		/>
	);
}
