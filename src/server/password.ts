const iterations = 100_000;
const hex = (bytes: Uint8Array) =>
	Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (value: string) =>
	Uint8Array.from(value.match(/.{2}/g) ?? [], (n) => Number.parseInt(n, 16));
async function derive(password: string, salt: Uint8Array) {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	return new Uint8Array(
		await crypto.subtle.deriveBits(
			{
				name: "PBKDF2",
				hash: "SHA-256",
				salt: new Uint8Array(salt),
				iterations,
			},
			key,
			256,
		),
	);
}
export async function hashPassword(password: string) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	return `pbkdf2-sha256$${iterations}$${hex(salt)}$${hex(await derive(password, salt))}`;
}
export async function verifyPassword({
	hash,
	password,
}: {
	hash: string;
	password: string;
}) {
	const parts = hash.split("$");
	if (
		parts.length !== 4 ||
		parts[0] !== "pbkdf2-sha256" ||
		parts[1] !== String(iterations) ||
		!/^[a-f0-9]{32}$/.test(parts[2]) ||
		!/^[a-f0-9]{64}$/.test(parts[3])
	)
		return false;
	const actual = await derive(password, unhex(parts[2]));
	const expected = unhex(parts[3]);
	let difference = 0;
	for (let i = 0; i < expected.length; i++)
		difference |= actual[i] ^ expected[i];
	return difference === 0;
}
