/** Only authored course/player paths may be used as an auth continuation. */
export function learningReturn(value: unknown): string {
	return typeof value === "string" &&
		/^\/(?:courses\/[a-z0-9-]+|learn\/[a-z0-9-]+\/[a-zA-Z0-9_-]+)$/.test(value)
		? value
		: "/dashboard";
}

export function learningAuthHref(
	page: "login" | "register" | "verify-email",
	returnTo: string,
) {
	const target = learningReturn(returnTo);
	return `/${page}${target === "/dashboard" ? "" : `?returnTo=${encodeURIComponent(target)}`}`;
}
