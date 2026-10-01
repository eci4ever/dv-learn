export function signatureSource(params: URLSearchParams) {
	return Array.from(params.entries())
		.filter(([key]) => key !== "x_signature")
		.map(([key, value]) => `${key}${value}`)
		.sort((a, b) =>
			a.toLowerCase() < b.toLowerCase()
				? -1
				: a.toLowerCase() > b.toLowerCase()
					? 1
					: 0,
		)
		.join("|");
}
export async function verifyBillplzSignature(
	params: URLSearchParams,
	secret: string,
) {
	const signature = params.get("x_signature") ?? "";
	if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
	if (
		new Set(Array.from(params.keys())).size !== Array.from(params.keys()).length
	)
		return false;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"],
	);
	const bytes = Uint8Array.from(signature.match(/../g) ?? [], (n) =>
		Number.parseInt(n, 16),
	);
	return crypto.subtle.verify(
		"HMAC",
		key,
		bytes,
		new TextEncoder().encode(signatureSource(params)),
	);
}
