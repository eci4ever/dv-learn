/** Strict dotted-decimal IPv4. Reject ambiguous leading zeros. */
export function parseIPv4(input: string): number[] | null {
	const parts = input.trim().split(".");
	if (
		parts.length !== 4 ||
		parts.some((p) => !/^(0|[1-9]\d{0,2})$/.test(p) || Number(p) > 255)
	)
		return null;
	return parts.map(Number);
}

export function isPrivateIPv4(octets: number[]): boolean {
	const [a, b] = octets;
	return (
		a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
	);
}

const format = (n: number) =>
	[24, 16, 8, 0].map((shift) => (n >>> shift) & 255).join(".");

/** Arithmetic avoids signed 32-bit overflow, including /0, /31 and /32. */
export function ipv4Subnet(input: string, prefix: number) {
	const octets = parseIPv4(input);
	if (!octets || !Number.isInteger(prefix) || prefix < 0 || prefix > 32)
		return null;
	const address = octets.reduce((n, octet) => n * 256 + octet, 0);
	const total = 2 ** (32 - prefix);
	const network = Math.floor(address / total) * total;
	const last = network + total - 1;
	return {
		network: format(network),
		mask: format(2 ** 32 - total),
		last: format(last),
		total,
		hosts: prefix >= 31 ? total : total - 2,
		firstHost: format(prefix >= 31 ? network : network + 1),
		lastHost: format(prefix >= 31 ? last : last - 1),
	};
}
