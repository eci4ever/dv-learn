export function youtubeId(value: string): string | null {
	try {
		const url = new URL(value);
		if (!["https:", "http:"].includes(url.protocol)) return null;
		const host = url.hostname.toLowerCase();
		const pieces = url.pathname.split("/").filter(Boolean);
		const id =
			host === "youtu.be"
				? pieces[0]
				: [
							"youtube.com",
							"www.youtube.com",
							"m.youtube.com",
							"www.youtube-nocookie.com",
						].includes(host)
					? url.pathname === "/watch"
						? url.searchParams.get("v")
						: ["embed", "shorts", "live"].includes(pieces[0])
							? pieces[1]
							: null
					: null;
		return id && /^[\w-]{11}$/.test(id) ? id : null;
	} catch {
		return null;
	}
}
