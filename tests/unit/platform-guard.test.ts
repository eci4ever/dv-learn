import { beforeEach, expect, it, vi } from "vitest";
import type { Viewer } from "../../src/server/contracts";

vi.mock("../../src/server/functions", () => ({ getViewer: vi.fn() }));

import { guardPlatformRoute } from "../../src/lib/platform-guard";
import { getViewer } from "../../src/server/functions";

const student: Viewer = {
	id: "student",
	name: "Student",
	email: "student@example.test",
	emailVerified: true,
	role: "student",
};
beforeEach(() => vi.mocked(getViewer).mockReset());
it.each(["/admin", "/admin/users", "/dashboard", "/orders", "/settings"])(
	"redirects anonymous %s before rendering",
	async (path) => {
		vi.mocked(getViewer).mockResolvedValue(null);
		await expect(guardPlatformRoute(path)).rejects.toMatchObject({
			options: { params: { _splat: "login" }, replace: true },
		});
	},
);
it.each(["admin", "student"] as const)(
	"requires verification for %s navigation",
	async (role) => {
		vi.mocked(getViewer).mockResolvedValue({
			...student,
			role,
			emailVerified: false,
		});
		await expect(guardPlatformRoute("/admin")).rejects.toMatchObject({
			options: { params: { _splat: "verify-email" } },
		});
	},
);
it("redirects regular users away from admin and rechecks a demoted admin", async () => {
	vi.mocked(getViewer)
		.mockResolvedValueOnce({ ...student, role: "admin" })
		.mockResolvedValueOnce(student);
	await expect(guardPlatformRoute("/admin")).resolves.toBeUndefined();
	await expect(guardPlatformRoute("/admin")).rejects.toMatchObject({
		options: { params: { _splat: "dashboard" } },
	});
	expect(getViewer).toHaveBeenCalledTimes(2);
});
it.each(["/dashboard", "/orders", "/settings"])(
	"allows verified users into %s",
	async (path) => {
		vi.mocked(getViewer).mockResolvedValue(student);
		await expect(guardPlatformRoute(path)).resolves.toBeUndefined();
	},
);
it.each([
	"/login",
	"/verify-email",
	"/courses/example",
	"/learn/example/preview",
])("preserves public route %s", async (path) => {
	await expect(guardPlatformRoute(path)).resolves.toBeUndefined();
	expect(getViewer).not.toHaveBeenCalled();
});
