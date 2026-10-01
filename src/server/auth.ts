import { getRequest } from "@tanstack/react-start/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import type { Viewer } from "./contracts";
import { sendEmail } from "./email";
import { hashPassword, verifyPassword } from "./password";
import { runtime } from "./runtime";
export function auth() {
	const { env, orm } = runtime();
	if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL)
		throw new Error("Authentication configuration is missing.");
	return betterAuth({
		advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
		database: drizzleAdapter(orm, { provider: "sqlite" }),
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		plugins: [admin(), tanstackStartCookies()],
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			minPasswordLength: 10,
			password: { hash: hashPassword, verify: verifyPassword },
			customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
				...coreFields,
				role: "user",
				banned: false,
				banReason: null,
				banExpires: null,
				...additionalFields,
				id,
			}),
			sendResetPassword: async ({ user, url }) => {
				await sendEmail(
					user.email,
					"Reset your password",
					`Reset your password: ${url}`,
				);
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			autoSignInAfterVerification: true,
			sendVerificationEmail: async ({ user, url }) => {
				await sendEmail(
					user.email,
					"Verify your email",
					`Verify your email: ${url}`,
				);
			},
		},
		rateLimit: { enabled: true, storage: "database" },
	});
}
export async function viewer(): Promise<Viewer | null> {
	const session = await auth().api.getSession({
		headers: getRequest().headers,
	});
	if (!session) return null;
	const { db } = runtime();
	const current = await db
		.prepare("SELECT role,banned,ban_expires FROM user WHERE id = ?")
		.bind(session.user.id)
		.first<{ role: string; banned: number; ban_expires: number | null }>();
	if (
		!current ||
		(current.banned &&
			(current.ban_expires === null || current.ban_expires > Date.now()))
	)
		return null;
	return {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
		emailVerified: session.user.emailVerified,
		role: current.role.split(",").includes("admin") ? "admin" : "student",
	};
}
export async function requireViewer(admin = false) {
	const user = await viewer();
	if (!user) throw new Error("Please sign in to continue.");
	if (!user.emailVerified)
		throw new Error("Please verify your email to continue.");
	if (admin && user.role !== "admin")
		throw new Error("Administrator permission is required.");
	return user;
}
export function requireSameOrigin() {
	const request = getRequest();
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(runtime().env.BETTER_AUTH_URL).origin)
		throw new Error("Invalid request origin.");
}
