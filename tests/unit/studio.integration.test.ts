import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sqliteD1 } from "./sqlite-d1";

const state = vi.hoisted(() => ({
	runtime: null as unknown,
	sessionId: "admin",
	origin: "http://localhost:3002",
}));
vi.mock("../../src/server/runtime", () => ({ runtime: () => state.runtime }));
vi.mock("@tanstack/react-start/server", () => ({
	getRequest: () => ({ headers: new Headers({ origin: state.origin }) }),
}));
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		let schema: { parse: (v: unknown) => unknown } | undefined;
		const builder = {
			validator: (s: typeof schema) => {
				schema = s;
				return builder;
			},
			handler:
				(handler: (args: { data: unknown }) => unknown) =>
				async (args: { data?: unknown } = {}) =>
					handler({ data: schema ? schema.parse(args.data) : args.data }),
		};
		return builder;
	},
}));
vi.mock("better-auth", () => ({
	betterAuth: () => ({
		api: {
			getSession: async () =>
				state.sessionId
					? {
							user: {
								id: state.sessionId,
								name: "Editor",
								email: "editor@example.test",
								emailVerified: true,
							},
						}
					: null,
			listUsers: async ({ query }: { query: { filterValue: string[] } }) => ({
				users: query.filterValue.map((id) => ({
					id,
					name: id,
					email: `${id}@example.test`,
					role: "user",
					banned: false,
				})),
				total: query.filterValue.length,
			}),
		},
	}),
}));
vi.mock("../../src/server/email", () => ({
	sendEmail: vi.fn(),
	sendReceipt: vi.fn(),
}));
vi.mock("../../src/server/payments", () => ({
	createCheckout: vi.fn(),
	reconcilePayment: vi.fn(),
}));

import {
	grantAccess,
	recordRefund,
	retryReceipts,
	revokeManualAccess,
	saveCourse,
	saveLesson,
	saveProduct,
	saveSection,
} from "../../src/server/functions";
import * as studio from "../../src/server/studio";

let fixture: ReturnType<typeof sqliteD1>;
beforeEach(() => {
	vi.clearAllMocks();
	fixture = sqliteD1();
	state.runtime = {
		db: fixture.db,
		orm: {},
		env: {
			BETTER_AUTH_SECRET: "local-test-only-secret",
			BETTER_AUTH_URL: "http://localhost:3002",
		},
	};
	state.sessionId = "admin";
	state.origin = "http://localhost:3002";
	fixture.sqlite.exec(
		`INSERT INTO user(id,name,email,email_verified,role,banned,created_at,updated_at) VALUES ('admin','Editor','admin@example.test',1,'admin',0,0,0),('student','Student','student@example.test',1,'user',0,0,0),('unverified','Unverified','unverified@example.test',0,'admin',0,0,0),('banned','Banned','banned@example.test',1,'admin',1,0,0); BEGIN;`,
	);
	const course = fixture.sqlite.prepare(
		"INSERT INTO courses(id,slug,title,published,archived,category,sort_order) VALUES (?,?,?,?,?,?,?)",
	);
	const section = fixture.sqlite.prepare(
		"INSERT INTO sections(id,course_id,title,sort_order) VALUES (?,?,?,?)",
	);
	const lesson = fixture.sqlite.prepare(
		"INSERT INTO lessons(id,section_id,title,content,video_url,resource_links,published,sort_order) VALUES (?,?,?,?,?,?,?,?)",
	);
	for (let c = 0; c < 100; c++) {
		course.run(
			`c${c}`,
			`course-${c}`,
			`Course ${c}`,
			c % 2,
			Number(c % 10 === 0),
			c % 2 ? "Design" : "Code",
			c,
		);
		section.run(`s${c}`, `c${c}`, `Section ${c}`, 0);
		for (let l = 0; l < 50; l++)
			lesson.run(
				`l${c}-${l}`,
				`s${c}`,
				`Lesson ${c}-${l}`,
				"PRIVATE NOTES".repeat(100),
				"https://www.youtube.com/watch?v=abcdefghijk",
				"https://example.test/resource",
				l % 2,
				l,
			);
	}
	fixture.sqlite.exec("COMMIT;");
});
afterEach(() => fixture.sqlite.close());

it("paginates all 100 courses and finds the last record without full lesson content", async () => {
	const ids: string[] = [];
	for (let page = 1; page <= 5; page++) {
		const result = await studio.listAdminCourses({ data: { page } });
		expect(result.total).toBe(100);
		expect(result.items).toHaveLength(20);
		ids.push(...result.items.map((c) => c.id));
		expect(result.items[0]).not.toHaveProperty("description");
	}
	expect(new Set(ids).size).toBe(100);
	expect(
		(await studio.listAdminCourses({ data: { q: "course-99" } })).items.map(
			(c) => c.id,
		),
	).toEqual(["c99"]);
	expect(
		(
			await studio.listAdminCourses({
				data: { category: "Design", status: "published" },
			})
		).total,
	).toBe(50);
	expect(
		(await studio.listAdminCourses({ data: { status: "archived" } })).total,
	).toBe(10);
	expect(
		(await studio.listAdminCourses({ data: { status: "draft" } })).total,
	).toBe(40);
	expect((await studio.listAdminCourses({ data: { q: "%" } })).total).toBe(0);
});
it("lists metadata for all 5,000 lessons and only details return notes, video and resources", async () => {
	let count = 0;
	for (let c = 0; c < 100; c++) {
		const result = await studio.listAdminLessons({
			data: { parentId: `s${c}`, page: 3 },
		});
		expect(result.total).toBe(50);
		expect(result.items).toHaveLength(10);
		expect(result.items[0]).not.toHaveProperty("content");
		expect(result.items[0]).not.toHaveProperty("videoUrl");
		expect(result.items[0]).not.toHaveProperty("resourceLinks");
		count += result.total;
	}
	expect(count).toBe(5000);
	const sections = await studio.listAdminSections({
		data: { parentId: "c99" },
	});
	expect(sections.items[0].lessonCount).toBe(50);
	expect(sections.items[0]).not.toHaveProperty("lessons");
	expect(
		(await studio.getAdminLesson({ data: { id: "l99-49" } })).lesson.content,
	).toContain("PRIVATE NOTES");
	expect(
		(await studio.listAdminLessons({ data: { parentId: "s99", q: "99-49" } }))
			.total,
	).toBe(1);
});
it("moves one record across page boundaries in a group exceeding 100, without touching other parents", async () => {
	const insert = fixture.sqlite.prepare(
		"INSERT INTO lessons(id,section_id,title,sort_order) VALUES (?,'s0',?,?)",
	);
	for (let n = 50; n < 125; n++) insert.run(`extra-${n}`, `Extra ${n}`, n);
	await studio.moveAdminContent({
		data: { kind: "lessons", id: "l0-20", parentId: "s0", direction: "up" },
	});
	expect(
		(await studio.listAdminLessons({ data: { parentId: "s0", page: 1 } }))
			.items[19].id,
	).toBe("l0-20");
	expect(
		(await studio.listAdminLessons({ data: { parentId: "s0", page: 2 } }))
			.items[0].id,
	).toBe("l0-19");
	await studio.moveAdminContent({
		data: { kind: "lessons", id: "extra-124", parentId: "s0", direction: "up" },
	});
	expect(
		fixture.sqlite
			.prepare("SELECT sort_order FROM lessons WHERE id='extra-124'")
			.get()?.sort_order,
	).toBe(123);
	expect(
		fixture.sqlite
			.prepare("SELECT sort_order FROM lessons WHERE id='l1-20'")
			.get()?.sort_order,
	).toBe(20);
	await expect(
		studio.moveAdminContent({
			data: { kind: "lessons", id: "l1-20", parentId: "s0", direction: "down" },
		}),
	).rejects.toThrow("group");
	await studio.moveAdminContent({
		data: { kind: "lessons", id: "l0-0", parentId: "s0", direction: "up" },
	});
	expect(
		fixture.sqlite
			.prepare("SELECT sort_order FROM lessons WHERE id='l0-0'")
			.get()?.sort_order,
	).toBe(0);
});
it("creates and updates courses, sections, lessons and products, appending moved parents", async () => {
	const course = await studio.getAdminCourse({ data: { id: "c1" } });
	await saveCourse({ data: { ...course, title: "Updated", sortOrder: 999 } });
	expect((await studio.getAdminCourse({ data: { id: "c1" } })).sortOrder).toBe(
		1,
	);
	const created = await saveCourse({
		data: { ...course, id: undefined, slug: "created", title: "Created" },
	});
	expect(
		(await studio.getAdminCourse({ data: { id: created.id } })).sortOrder,
	).toBe(100);
	const section = await saveSection({
		data: { courseId: created.id, title: "New section", sortOrder: 999 },
	});
	expect(
		(await studio.getAdminSection({ data: { id: section.id } })).sortOrder,
	).toBe(0);
	const { lesson } = await studio.getAdminLesson({ data: { id: "l0-0" } });
	await saveLesson({ data: { ...lesson, sectionId: "s1", sortOrder: 0 } });
	const moved = await studio.getAdminLesson({ data: { id: lesson.id } });
	expect(moved.section.courseId).toBe("c1");
	expect(moved.lesson.sortOrder).toBe(50);
	await saveSection({
		data: { id: "s0", courseId: "c1", title: "Moved section", sortOrder: 0 },
	});
	expect((await studio.getAdminSection({ data: { id: "s0" } })).sortOrder).toBe(
		1,
	);
	const product = await saveProduct({
		data: {
			title: "Bundle",
			description: "",
			priceCents: 1250,
			active: true,
			courseIds: ["c0", "c1"],
		},
	});
	await saveProduct({
		data: {
			...(await studio.getAdminProduct({ data: { id: product.id } })),
			title: "Edited bundle",
			courseIds: ["c1"],
		},
	});
	expect(
		(await studio.getAdminProduct({ data: { id: product.id } })).courseIds,
	).toEqual(["c1"]);
	await expect(
		saveSection({
			data: { courseId: "missing", title: "Wrong parent", sortOrder: 0 },
		}),
	).rejects.toThrow("Course");
	await expect(
		saveLesson({ data: { ...lesson, sectionId: "missing" } }),
	).rejects.toThrow("Section");
});
it("grants and revokes only manual access, preserves progress and filters all grants", async () => {
	await grantAccess({ data: { userId: "student", courseId: "c1" } });
	fixture.sqlite.exec(
		"INSERT INTO course_access(id,user_id,course_id,source,source_id,created_at) VALUES ('purchase','student','c1','order','order-1',0); INSERT INTO progress(user_id,lesson_id,position_seconds,completed,updated_at) VALUES ('student','l1-1',30,1,0);",
	);
	expect(
		(
			await studio.listAdminAccess({
				data: { q: "student", source: "manual", status: "active" },
			})
		).total,
	).toBe(1);
	await revokeManualAccess({ data: { userId: "student", courseId: "c1" } });
	expect(
		(await studio.listAdminAccess({ data: { status: "active" } })).items.map(
			(a) => a.source,
		),
	).toEqual(["order"]);
	expect(
		(await studio.listAdminAccess({ data: { status: "revoked" } })).total,
	).toBe(1);
	expect(
		fixture.sqlite
			.prepare("SELECT completed FROM progress WHERE user_id='student'")
			.get()?.completed,
	).toBe(1);
	await expect(
		grantAccess({ data: { userId: "unverified", courseId: "c1" } }),
	).rejects.toThrow("verified");
});
it("paginates operations beyond 100 and refunds only the originating order grant", async () => {
	fixture.sqlite.exec(
		"INSERT INTO products(id,title,price_cents,active) VALUES ('bundle','Bundle',100,1);",
	);
	const order = fixture.sqlite.prepare(
		"INSERT INTO orders(id,user_id,product_id,product_title,amount_cents,status,created_at,paid_at,collection_id) VALUES (?,'student','bundle','Bundle',100,'paid',?,?, 'local')",
	);
	const receipt = fixture.sqlite.prepare(
		"INSERT INTO email_outbox(id,order_id,recipient,sent_at) VALUES (?,?,'student@example.test',?)",
	);
	const access = fixture.sqlite.prepare(
		"INSERT INTO course_access(id,user_id,course_id,source,source_id,created_at) VALUES (?,'student','c1','order',?,0)",
	);
	const audit = fixture.sqlite.prepare(
		"INSERT INTO audit_log(id,actor_id,action,entity_id,created_at) VALUES (?,'admin','fixture',?,?)",
	);
	for (let n = 0; n < 105; n++) {
		const id = `order-${n}`;
		order.run(id, n, n);
		receipt.run(id, id, n < 50 ? n : null);
		access.run(id, id);
		audit.run(id, id, n);
	}
	expect(
		(await studio.listAdminOrders({ data: { page: 6 } })).items,
	).toHaveLength(5);
	expect(
		(await studio.listAdminReceipts({ data: { status: "unsent" } })).total,
	).toBe(55);
	expect(
		(await studio.listAdminAudit({ data: { q: "fixture", page: 6 } })).items,
	).toHaveLength(5);
	expect((await studio.getAdminOperationsSummary()).revenueCents).toBe(10500);
	await grantAccess({ data: { userId: "student", courseId: "c1" } });
	await recordRefund({
		data: { orderId: "order-104", reason: "Refund completed externally" },
	});
	await recordRefund({
		data: { orderId: "order-104", reason: "Idempotent repeat" },
	});
	expect((await studio.getAdminOperationsSummary()).paid).toBe(104);
	expect((await studio.getAdminOperationsSummary()).revenueCents).toBe(10400);
	expect(
		(await studio.listAdminOrders({ data: { status: "refunded" } })).total,
	).toBe(1);
	expect(
		(
			await studio.listAdminAccess({
				data: { source: "manual", status: "active" },
			})
		).total,
	).toBe(1);
	expect(
		(
			await studio.listAdminAccess({
				data: { source: "order", status: "active" },
			})
		).total,
	).toBe(104);
	expect(await retryReceipts()).toEqual({ sent: 20, failed: 0 });
});
it("searches name or email together and supplies bounded picker labels", async () => {
	expect(
		(await studio.listAdminUsers({ data: { q: "student@example" } })).items.map(
			(u) => u.id,
		),
	).toEqual(["student"]);
	expect(
		(await studio.listAdminUserChoices({ data: { q: "Student" } })).total,
	).toBe(1);
	expect(
		await studio.getAdminChoiceLabels({
			data: { kind: "courses", ids: ["c99"] },
		}),
	).toEqual([{ id: "c99", title: "Course 99" }]);
});
it.each(["", "student", "unverified", "banned"])(
	"rejects every Studio read and write RPC for denied account %s",
	async (sessionId) => {
		const course = await studio.getAdminCourse({ data: { id: "c0" } });
		const section = await studio.getAdminSection({ data: { id: "s0" } });
		const { lesson } = await studio.getAdminLesson({ data: { id: "l0-0" } });
		state.sessionId = sessionId;
		const reads = [
			() => studio.reconcileAdminOrder({ data: { orderId: "missing" } }),
			() => saveCourse({ data: course }),
			() => saveSection({ data: section }),
			() => saveLesson({ data: lesson }),
			() =>
				saveProduct({
					data: {
						title: "Denied",
						description: "",
						priceCents: 100,
						active: true,
						courseIds: ["c0"],
					},
				}),
			() =>
				studio.getAdminChoiceLabels({ data: { kind: "courses", ids: ["c0"] } }),
			() => studio.listAdminCourses({ data: {} }),
			() => studio.getAdminCategories(),
			() => studio.getAdminCourse({ data: { id: "c0" } }),
			() => studio.listAdminSections({ data: { parentId: "c0" } }),
			() => studio.getAdminSection({ data: { id: "s0" } }),
			() => studio.listAdminLessons({ data: { parentId: "s0" } }),
			() => studio.getAdminLesson({ data: { id: "l0-0" } }),
			() => studio.listAdminProducts({ data: {} }),
			() => studio.getAdminProduct({ data: { id: "missing" } }),
			() => studio.listAdminUsers({ data: {} }),
			() => studio.listAdminUserChoices({ data: {} }),
			() => studio.listAdminAccess({ data: {} }),
			() => studio.listAdminOrders({ data: {} }),
			() => studio.listAdminReceipts({ data: {} }),
			() => studio.listAdminAudit({ data: {} }),
			() => studio.getAdminOperationsSummary(),
			() =>
				studio.moveAdminContent({
					data: { kind: "courses", id: "c0", direction: "up" },
				}),
			() => grantAccess({ data: { userId: "student", courseId: "c1" } }),
			() => revokeManualAccess({ data: { userId: "student", courseId: "c1" } }),
			() => retryReceipts(),
			() =>
				recordRefund({
					data: { orderId: "missing", reason: "Already refunded" },
				}),
		];
		for (const read of reads) await expect(read()).rejects.toThrow();
		expect(
			fixture.sqlite.prepare("SELECT COUNT(*) AS count FROM audit_log").get()
				?.count,
		).toBe(0);
	},
);
it("rejects invalid RPC filters, page bounds and cross-origin mutations", async () => {
	await expect(
		studio.listAdminCourses({ data: { page: -1 } }),
	).rejects.toThrow();
	await expect(
		studio.listAdminCourses({ data: { q: "x".repeat(201) } }),
	).rejects.toThrow();
	expect(studio.studioSearch.parse({ page: -1 }).page).toBe(1);
	state.origin = "https://untrusted.example";
	await expect(
		studio.moveAdminContent({
			data: { kind: "courses", id: "c0", direction: "down" },
		}),
	).rejects.toThrow("origin");
});
