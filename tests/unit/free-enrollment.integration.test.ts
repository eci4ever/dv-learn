import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Viewer } from "../../src/server/contracts";
import { sqliteD1 } from "./sqlite-d1";

const state = vi.hoisted(() => ({
	user: null as Viewer | null,
	runtime: null as unknown,
	sameOrigin: true,
}));
vi.mock("../../src/server/runtime", () => ({ runtime: () => state.runtime }));
vi.mock("../../src/server/auth", () => ({
	viewer: async () => state.user,
	auth: vi.fn(),
	requireViewer: async () => {
		if (!state.user?.emailVerified)
			throw new Error("Verified sign in required");
		return state.user;
	},
	requireSameOrigin: () => {
		if (!state.sameOrigin) throw new Error("Cross-origin mutation");
	},
}));
vi.mock("../../src/server/payments", () => ({
	createCheckout: vi.fn(),
	reconcilePayment: vi.fn(),
}));
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

import { access } from "../../src/server/data";
import {
	enrollFree,
	getCourse,
	getDashboard,
	getLesson,
	saveProgress,
} from "../../src/server/functions";

let fixture: ReturnType<typeof sqliteD1>;
const student: Viewer = {
	id: "student",
	name: "Student",
	email: "student@example.test",
	emailVerified: true,
	role: "student",
};
beforeEach(() => {
	fixture = sqliteD1();
	state.runtime = { db: fixture.db };
	state.user = student;
	state.sameOrigin = true;
	fixture.sqlite.exec(`INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('student','Student','student@example.test',1,0,0);
	INSERT INTO courses(id,slug,title,published,free_enrollment) VALUES ('free','free','Free course',1,1);
	INSERT INTO sections(id,course_id,title) VALUES ('section','free','Section');
	INSERT INTO lessons(id,section_id,title,content,preview,published,lesson_type) VALUES ('one','section','First','Content',1,1,'reading'),('two','section','Second','Content',1,1,'reading');`);
});
afterEach(() => fixture.sqlite.close());
const count = () =>
	fixture.sqlite.prepare("SELECT count(*) AS count FROM free_enrollments").get()
		?.count;

it("keeps anonymous practice public and enrollment optional", async () => {
	state.user = null;
	expect((await getCourse({ data: { slug: "free" } })).canEnrollFree).toBe(
		true,
	);
	expect(
		(await getLesson({ data: { courseSlug: "free", lessonId: "one" } }))
			.hasAccess,
	).toBe(false);
	await expect(enrollFree({ data: { slug: "free" } })).rejects.toThrow(
		"sign in",
	);
	expect(count()).toBe(0);
});
it("enrolls idempotently without purchase/manual grants and persists manual completion", async () => {
	await expect(
		saveProgress({
			data: { lessonId: "one", positionSeconds: 0, completed: true },
		}),
	).rejects.toThrow();
	await enrollFree({ data: { slug: "free" } });
	await enrollFree({ data: { slug: "free" } });
	expect(count()).toBe(1);
	expect(
		fixture.sqlite.prepare("SELECT count(*) AS count FROM course_access").get()
			?.count,
	).toBe(0);
	expect(
		fixture.sqlite.prepare("SELECT count(*) AS count FROM orders").get()?.count,
	).toBe(0);
	expect(await access("student", "free")).toBe(true);
	await saveProgress({
		data: { lessonId: "one", positionSeconds: 0, completed: true },
	});
	expect(
		(await getLesson({ data: { courseSlug: "free", lessonId: "one" } }))
			.progress?.completed,
	).toBe(true);
	const dashboard = await getDashboard();
	expect(dashboard.courses[0].completedLessons).toBe(1);
	expect(dashboard.courses[0].nextLessonId).toBe("two");
});
it.each([
	"UPDATE courses SET free_enrollment=0",
	"UPDATE courses SET published=0",
	"UPDATE courses SET archived=1",
	"UPDATE lessons SET preview=0 WHERE id='two'",
	"UPDATE lessons SET published=0",
	"INSERT INTO products(id,title,description,price_cents,active) VALUES ('paid','Paid','Paid',1000,1); INSERT INTO product_courses(product_id,course_id) VALUES ('paid','free')",
])(
	"rechecks eligibility before enrollment and for existing access: %s",
	async (change) => {
		await enrollFree({ data: { slug: "free" } });
		fixture.sqlite.exec(change);
		expect(await access("student", "free")).toBe(false);
		expect((await getDashboard()).courses).toHaveLength(0);
		await expect(enrollFree({ data: { slug: "free" } })).rejects.toThrow(
			"not available",
		);
		await expect(
			saveProgress({
				data: { lessonId: "one", positionSeconds: 0, completed: true },
			}),
		).rejects.toThrow();
		expect(count()).toBe(1);
	},
);
it("does not revive revoked free enrollments or affect paid/manual access", async () => {
	await enrollFree({ data: { slug: "free" } });
	fixture.sqlite.exec("UPDATE free_enrollments SET revoked_at=1");
	await expect(enrollFree({ data: { slug: "free" } })).rejects.toThrow(
		"unavailable",
	);
	expect(await access("student", "free")).toBe(false);
	fixture.sqlite.exec(
		"INSERT INTO course_access(id,user_id,course_id,source,source_id,created_at) VALUES ('manual','student','free','manual','manual',0); UPDATE courses SET free_enrollment=0",
	);
	expect(await access("student", "free")).toBe(true);
});
it("rejects unverified, banned, stale verification and cross-origin enrollment", async () => {
	state.user = { ...student, emailVerified: false };
	await expect(enrollFree({ data: { slug: "free" } })).rejects.toThrow(
		"Verified",
	);
	state.user = student;
	state.sameOrigin = false;
	await expect(enrollFree({ data: { slug: "free" } })).rejects.toThrow(
		"Cross-origin",
	);
	state.sameOrigin = true;
	fixture.sqlite.exec("UPDATE user SET email_verified=0");
	await expect(enrollFree({ data: { slug: "free" } })).rejects.toThrow(
		"unavailable",
	);
	fixture.sqlite.exec("UPDATE user SET email_verified=1,banned=1");
	await expect(enrollFree({ data: { slug: "free" } })).rejects.toThrow(
		"unavailable",
	);
	expect(count()).toBe(0);
});

it("permits enrollment after a temporary ban expires", async () => {
	fixture.sqlite.exec("UPDATE user SET banned=1,ban_expires=1");
	await enrollFree({ data: { slug: "free" } });
	expect(count()).toBe(1);
});
