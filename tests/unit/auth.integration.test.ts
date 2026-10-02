import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sqliteD1 } from "./sqlite-d1";

const state = vi.hoisted(() => ({
	runtime: null as unknown,
	session: null as unknown,
	options: vi.fn(),
}));
vi.mock("../../src/server/runtime", () => ({ runtime: () => state.runtime }));
vi.mock("@tanstack/react-start/server", () => ({
	getRequest: () => new Request("https://learn.example.test"),
}));
vi.mock("better-auth", () => ({
	betterAuth: (options: unknown) => {
		state.options(options);
		return { api: { getSession: async () => state.session } };
	},
}));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: () => ({}) }));
vi.mock("better-auth/plugins", () => ({ admin: () => ({ id: "admin" }) }));
vi.mock("better-auth/tanstack-start", () => ({
	tanstackStartCookies: () => ({ id: "tanstack-start-cookies" }),
}));
vi.mock("../../src/server/email", () => ({ sendEmail: vi.fn() }));

import { auth, requireViewer, viewer } from "../../src/server/auth";
import { sendEmail } from "../../src/server/email";

let fixture: ReturnType<typeof sqliteD1>;
const env = {
	BETTER_AUTH_SECRET: "test-only",
	BETTER_AUTH_URL: "https://learn.example.test",
};
beforeEach(() => {
	fixture = sqliteD1();
	fixture.sqlite.exec(
		"INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('student','Student','student@example.test',1,0,0)",
	);
	state.runtime = { db: fixture.db, env };
	state.session = {
		user: {
			id: "student",
			name: "Student",
			email: "student@example.test",
			emailVerified: true,
			role: "admin",
		},
	};
});
afterEach(() => fixture.sqlite.close());

it("keeps the TanStack cookie plugin last", () => {
	auth();
	expect(
		state.options.mock.lastCall?.[0].plugins.map(
			(plugin: { id: string }) => plugin.id,
		),
	).toEqual(["admin", "tanstack-start-cookies"]);
});
it("sends the verification template through the Better Auth callback", async () => {
	auth();
	const url =
		"https://learn.example.test/api/auth/verify-email?token=test-only";
	await state.options.mock.lastCall?.[0].emailVerification.sendVerificationEmail(
		{ user: { email: "student@example.test", name: "Student" }, url },
	);
	expect(sendEmail).toHaveBeenLastCalledWith(
		"student@example.test",
		"DV Learn: Sahkan alamat e-mel anda",
		expect.stringContaining(url),
		undefined,
		expect.stringContaining(`href="${url}"`),
	);
});
it("rejects stale or forged session admin roles at the data boundary", async () => {
	expect((await viewer())?.role).toBe("student");
	await expect(requireViewer(true)).rejects.toThrow("Administrator permission");
	fixture.sqlite.exec("UPDATE user SET role='admin'");
	expect((await requireViewer(true)).role).toBe("admin");
	fixture.sqlite.exec("UPDATE user SET role='user'");
	await expect(requireViewer(true)).rejects.toThrow("Administrator permission");
});
it("never promotes a user merely by resolving a verified session", async () => {
	expect((await viewer())?.role).toBe("student");
	expect((await viewer())?.role).toBe("student");
	expect(fixture.sqlite.prepare("SELECT role FROM user").get()).toEqual({
		role: "user",
	});
});
it("requires verification even for a plugin-assigned admin", async () => {
	fixture.sqlite.exec("UPDATE user SET role='admin'");
	state.session = {
		user: {
			id: "student",
			name: "Student",
			email: "student@example.test",
			emailVerified: false,
		},
	};
	await expect(requireViewer(true)).rejects.toThrow("verify your email");
});
it("rejects actively banned sessions and permits expired bans", async () => {
	fixture.sqlite.exec("UPDATE user SET banned=1,ban_expires=NULL");
	expect(await viewer()).toBeNull();
	await expect(requireViewer()).rejects.toThrow("Please sign in");
	fixture.sqlite.exec("UPDATE user SET ban_expires=1");
	expect((await viewer())?.id).toBe("student");
});
it("rejects verification revoked in the database despite a stale verified session", async () => {
	fixture.sqlite.exec("UPDATE user SET role='admin',email_verified=0");
	expect((await viewer())?.emailVerified).toBe(false);
	await expect(requireViewer()).rejects.toThrow("verify your email");
	await expect(requireViewer(true)).rejects.toThrow("verify your email");
});
