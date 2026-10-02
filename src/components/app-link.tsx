import { Link, useLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";

// Public application pages use /$; Studio has its own protected route tree.
export function AppLink({
	href,
	...props
}: ComponentProps<"a"> & { href: string }) {
	const [path, hash] = href.split("#");
	const pathname = useLocation({ select: (location) => location.pathname });
	const destination = path || pathname;
	if (destination === "/admin")
		return <Link {...props} to="/admin/courses" hash={hash} />;
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
