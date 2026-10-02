import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Viewer } from "../../src/server/contracts";
import { sqliteD1 } from "./sqlite-d1";

const state = vi.hoisted(() => ({
	user: null as Viewer | null,
	runtime: null as unknown,
}));
vi.mock("../../src/server/runtime", () => ({ runtime: () => state.runtime }));
vi.mock("../../src/server/auth", () => ({
	viewer: async () => state.user,
	auth: vi.fn(),
	requireViewer: vi.fn(),
	requireSameOrigin: vi.fn(),
}));
vi.mock("../../src/server/payments", () => ({
	createCheckout: vi.fn(),
	reconcilePayment: vi.fn(),
}));
// Exercise the production handlers and SQL without the RPC transport.
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		const builder = {
			validator: () => builder,
			handler: (handler: unknown) => handler,
		};
		return builder;
	},
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: vi.fn() }));

import { getCourse, getLesson } from "../../src/server/functions";

let fixture: ReturnType<typeof sqliteD1>;
const user: Viewer = {
	id: "student",
	name: "Student",
	email: "student@example.test",
	emailVerified: true,
	role: "student",
};
beforeEach(() => {
	fixture = sqliteD1();
	state.runtime = { db: fixture.db };
	state.user = user;
	fixture.sqlite.exec(`
		INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('student','Student','student@example.test',1,0,0);
		INSERT INTO courses(id,slug,title,published) VALUES ('public','public','Public course',1),('draft','draft','Draft course',0);
		INSERT INTO sections(id,course_id,title) VALUES ('public-section','public','Public section'),('draft-section','draft','Draft section');
		INSERT INTO lessons(id,section_id,title,content,preview,published) VALUES ('paid','public-section','Paid lesson','PRIVATE_CONTENT',0,1),('preview','public-section','Preview','PREVIEW_CONTENT',1,1),('draft-lesson','public-section','Draft lesson','DRAFT_CONTENT',0,0),('draft-preview','draft-section','Draft preview','DRAFT_PREVIEW',1,1);
		INSERT INTO course_access(id,user_id,course_id,source,source_id,created_at) VALUES ('grant','student','public','manual','manual',0);
	`);
});
afterEach(() => fixture.sqlite.close());
it.each(["admin", "student"] as const)(
	"denies private content and draft access to unverified %s",
	async (role) => {
		state.user = { ...user, emailVerified: false, role };
		expect((await getCourse({ data: { slug: "public" } })).hasAccess).toBe(
			false,
		);
		await expect(getCourse({ data: { slug: "draft" } })).rejects.toThrow(
			"Course not found",
		);
		await expect(
			getLesson({ data: { courseSlug: "public", lessonId: "paid" } }),
		).rejects.toThrow("verify your email");
		await expect(
			getLesson({ data: { courseSlug: "public", lessonId: "draft-lesson" } }),
		).rejects.toThrow("Lesson not found");
		const preview = await getLesson({
			data: { courseSlug: "public", lessonId: "preview" },
		});
		expect(preview.lesson.content).toBe("PREVIEW_CONTENT");
		expect(preview.hasAccess).toBe(false);
		expect(preview.progress).toBeNull();
	},
);
it("keeps published previews public, but not previews inside draft courses", async () => {
	state.user = null;
	expect(
		(await getLesson({ data: { courseSlug: "public", lessonId: "preview" } }))
			.lesson.content,
	).toBe("PREVIEW_CONTENT");
	await expect(
		getLesson({ data: { courseSlug: "public", lessonId: "paid" } }),
	).rejects.toThrow("Purchase this course");
	await expect(
		getLesson({ data: { courseSlug: "draft", lessonId: "draft-preview" } }),
	).rejects.toThrow("Course not found");
});
it("allows enrolled verified users, but rejects revoked access and unpublished lessons", async () => {
	expect(
		(await getLesson({ data: { courseSlug: "public", lessonId: "paid" } }))
			.lesson.content,
	).toBe("PRIVATE_CONTENT");
	await expect(
		getLesson({ data: { courseSlug: "public", lessonId: "draft-lesson" } }),
	).rejects.toThrow("Lesson not found");
	fixture.sqlite.exec("UPDATE course_access SET revoked_at=1");
	await expect(
		getLesson({ data: { courseSlug: "public", lessonId: "paid" } }),
	).rejects.toThrow("Purchase this course");
});
it("allows verified admins to read drafts and paid content without enrollment", async () => {
	state.user = { ...user, role: "admin" };
	fixture.sqlite.exec("DELETE FROM course_access");
	expect((await getCourse({ data: { slug: "draft" } })).hasAccess).toBe(true);
	expect(
		(
			await getLesson({
				data: { courseSlug: "public", lessonId: "draft-lesson" },
			})
		).lesson.content,
	).toBe("DRAFT_CONTENT");
	expect(
		(await getLesson({ data: { courseSlug: "public", lessonId: "paid" } }))
			.hasAccess,
	).toBe(true);
});
