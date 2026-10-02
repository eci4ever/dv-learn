import { redirect } from "@tanstack/react-router";
import { getViewer } from "../server/functions";

/** Navigation only; every private server function also enforces authorization. */
export async function guardPlatformRoute(pathname: string) {
	const area = pathname.split("/").filter(Boolean)[0];
	if (!["admin", "dashboard", "orders", "settings"].includes(area ?? ""))
		return;
	// Fetch fresh server state, not the cached client viewer/role.
	const user = await getViewer();
	if (!user)
		throw redirect({ to: "/$", params: { _splat: "login" }, replace: true });
	if (!user.emailVerified)
		throw redirect({
			to: "/$",
			params: { _splat: "verify-email" },
			replace: true,
		});
	if (area === "admin" && user.role !== "admin")
		throw redirect({
			to: "/$",
			params: { _splat: "dashboard" },
			replace: true,
		});
}
