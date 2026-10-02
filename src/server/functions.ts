import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth, requireSameOrigin, requireViewer, viewer } from "./auth";
import type {
	AdminResponse,
	CourseResponse,
	DashboardResponse,
	Lesson,
	LessonResponse,
	Progress,
	Section,
} from "./contracts";
import * as data from "./data";
import { createCheckout, reconcilePayment } from "./payments";
import { runtime } from "./runtime";
import * as v from "./validation";

export type * from "./contracts";
export const recordRefund = createServerFn({ method: "POST" })
	.validator(v.refundInput)
	.handler(async ({ data: input }) => {
		const db = await adminMutation();
		const actor = await requireViewer(true);
		if (
			!(await db
				.prepare("SELECT id FROM orders WHERE id=? AND status='paid'")
				.bind(input.orderId)
				.first())
		)
			throw new Error("Paid order required.");
		await db.batch([
			db
				.prepare(
					"INSERT OR IGNORE INTO order_refunds(order_id,actor_id,reason,created_at) VALUES (?,?,?,?)",
				)
				.bind(input.orderId, actor.id, input.reason, Date.now()),
			db
				.prepare(
					"UPDATE course_access SET revoked_at=? WHERE source='order' AND source_id=?",
				)
				.bind(Date.now(), input.orderId),
		]);
		return { success: true };
	});
export const getViewer = createServerFn({ method: "GET" }).handler(() =>
	viewer(),
);
export const getCatalog = createServerFn({ method: "GET" }).handler(
	async () => ({
		courses: await data.courses(),
		products: await data.products(),
		viewer: await viewer(),
	}),
);
export const getCourse = createServerFn({ method: "GET" })
	.validator(v.courseQuery)
	.handler(async ({ data: input }): Promise<CourseResponse> => {
		const user = await viewer();
		const isAdmin = Boolean(user?.emailVerified && user.role === "admin");
		const course = (await data.courses(isAdmin)).find(
			(c) => c.slug === input.slug,
		);
		if (!course) throw new Error("Course not found.");
		return {
			course,
			sections: await data.sections(course.id, isAdmin),
			products: (await data.products()).filter((p) =>
				p.courseIds.includes(course.id),
			),
			hasAccess: Boolean(
				user?.emailVerified &&
					(user.role === "admin" || (await data.access(user.id, course.id))),
			),
			viewer: user,
		};
	});
export const getDashboard = createServerFn({ method: "GET" }).handler(
	async (): Promise<DashboardResponse> => {
		const user = await requireViewer();
		const progress = await data.progress(user.id);
		const available = await data.courses(user.role === "admin");
		const enrolled = await data.rows<{ courseId: string }>(
			"SELECT DISTINCT course_id AS courseId FROM course_access WHERE user_id=? AND revoked_at IS NULL",
			user.id,
		);
		const courses = await Promise.all(
			available
				.filter(
					(c) =>
						user.role === "admin" || enrolled.some((e) => e.courseId === c.id),
				)
				.map(async (c) => {
					const lessons = (await data.sections(c.id)).flatMap((s) => s.lessons);
					const completed = lessons.filter((l) =>
						progress.some((p) => p.lessonId === l.id && p.completed),
					).length;
					const recent = progress
						.filter(
							(p) => !p.completed && lessons.some((l) => l.id === p.lessonId),
						)
						.sort((a, b) => b.updatedAt - a.updatedAt)[0];
					return {
						...c,
						totalLessons: lessons.length,
						completedLessons: completed,
						progressPercent: lessons.length
							? Math.round((completed / lessons.length) * 100)
							: 0,
						nextLessonId:
							recent?.lessonId ??
							lessons.find(
								(l) =>
									!progress.some((p) => p.lessonId === l.id && p.completed),
							)?.id ??
							null,
					};
				}),
		);
		return { viewer: user, courses, progress };
	},
);
export const getLesson = createServerFn({ method: "GET" })
	.validator(v.lessonQuery)
	.handler(async ({ data: input }): Promise<LessonResponse> => {
		const user = await viewer();
		const isAdmin = Boolean(user?.emailVerified && user.role === "admin");
		const course = (await data.courses(isAdmin)).find(
			(c) => c.slug === input.courseSlug,
		);
		if (!course) throw new Error("Course not found.");
		const sections = await data.sections(course.id, isAdmin);
		const summary = sections
			.flatMap((s) => s.lessons)
			.find((l) => l.id === input.lessonId);
		if (!summary) throw new Error("Lesson not found.");
		const hasAccess = Boolean(
			user?.emailVerified &&
				(user.role === "admin" || (await data.access(user.id, course.id))),
		);
		if (!hasAccess && !summary.preview) {
			if (user && !user.emailVerified)
				throw new Error("Please verify your email to continue.");
			throw new Error("Purchase this course to access this lesson.");
		}
		const [lesson] = await data.rows<Lesson>(
			`SELECT ${data.lessonColumns} FROM lessons WHERE id=?`,
			input.lessonId,
		);
		return {
			course,
			lesson: {
				...lesson,
				published: Boolean(lesson.published),
				preview: Boolean(lesson.preview),
			},
			sections,
			hasAccess,
			progress: user?.emailVerified
				? ((await data.progress(user.id)).find(
						(p) => p.lessonId === lesson.id,
					) ?? null)
				: null,
		};
	});
export const saveProgress = createServerFn({ method: "POST" })
	.validator(v.progressInput)
	.handler(async ({ data: input }): Promise<Progress> => {
		requireSameOrigin();
		const user = await requireViewer();
		const [lesson] = await data.rows<{
			courseId: string;
			duration: number;
			preview: number;
			published: number;
			coursePublished: number;
		}>(
			"SELECT s.course_id AS courseId,l.duration_seconds AS duration,l.preview,l.published,c.published AS coursePublished FROM lessons l JOIN sections s ON s.id=l.section_id JOIN courses c ON c.id=s.course_id WHERE l.id=?",
			input.lessonId,
		);
		if (
			!lesson ||
			(user.role !== "admin" &&
				(!lesson.published ||
					!lesson.coursePublished ||
					!(await data.access(user.id, lesson.courseId))))
		)
			throw new Error("Course access is required to save progress.");
		const position = lesson.duration
			? Math.min(input.positionSeconds, lesson.duration)
			: input.positionSeconds;
		await runtime()
			.db.prepare(
				"INSERT INTO progress(user_id,lesson_id,position_seconds,completed,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET position_seconds=excluded.position_seconds,completed=MAX(progress.completed,excluded.completed),updated_at=excluded.updated_at",
			)
			.bind(
				user.id,
				input.lessonId,
				position,
				Number(input.completed),
				Date.now(),
			)
			.run();
		const progress = (await data.progress(user.id)).find(
			(p) => p.lessonId === input.lessonId,
		);
		if (!progress) throw new Error("Progress could not be saved.");
		return progress;
	});
export const checkout = createServerFn({ method: "POST" })
	.validator(v.checkoutInput)
	.handler(async ({ data: input }) => {
		requireSameOrigin();
		return createCheckout(await requireViewer(), input.productId);
	});
export const getOrders = createServerFn({ method: "GET" }).handler(async () =>
	data.orders((await requireViewer()).id),
);
export const reconcileOrder = createServerFn({ method: "POST" })
	.validator(v.orderInput)
	.handler(async ({ data: input }) => {
		requireSameOrigin();
		return reconcilePayment(await requireViewer(), input.orderId);
	});
export const getAdminData = createServerFn({ method: "GET" }).handler(
	async (): Promise<AdminResponse> => {
		const user = await requireViewer(true);
		const [courses, sections, lessons, products, orders, users, enrollments] =
			await Promise.all([
				data.courses(true),
				data.rows<Section>(
					`SELECT ${data.sectionColumns} FROM sections ORDER BY sort_order`,
				),
				data.rows<Lesson>(
					`SELECT ${data.lessonColumns} FROM lessons ORDER BY sort_order`,
				),
				data.products(true),
				data.rows<AdminResponse["orders"][number]>(
					`SELECT ${data.orderColumns},o.user_id AS userId,u.email FROM orders o JOIN user u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 500`,
				),
				auth().api.listUsers({
					headers: getRequest().headers,
					query: { limit: 500, sortBy: "createdAt", sortDirection: "desc" },
				}),
				data.rows<AdminResponse["enrollments"][number]>(
					"SELECT user_id AS userId,course_id AS courseId,MIN(created_at) AS createdAt FROM course_access WHERE revoked_at IS NULL GROUP BY user_id,course_id",
				),
			]);
		return {
			viewer: user,
			courses,
			sections,
			lessons: lessons.map((l) => ({
				...l,
				published: Boolean(l.published),
				preview: Boolean(l.preview),
			})),
			products,
			orders,
			users: users.users.map((u) => ({
				id: u.id,
				name: u.name,
				email: u.email,
				role: u.role?.split(",").includes("admin") ? "admin" : "student",
				emailVerified: Boolean(u.emailVerified),
			})),
			enrollments,
		};
	},
);
async function adminMutation() {
	requireSameOrigin();
	const actor = await requireViewer(true);
	await runtime()
		.db.prepare(
			"INSERT INTO audit_log(id,actor_id,action,entity_id,created_at) VALUES (?,?,?,?,?)",
		)
		.bind(
			crypto.randomUUID(),
			actor.id,
			"admin-mutation-attempt",
			"platform",
			Date.now(),
		)
		.run();
	return runtime().db;
}
export const saveCourse = createServerFn({ method: "POST" })
	.validator(v.courseInput)
	.handler(async ({ data: c }) => {
		const db = await adminMutation();
		const id = c.id ?? crypto.randomUUID();
		await db
			.prepare(
				"INSERT INTO courses(id,slug,title,description,image_url,instructor,level,published,sort_order,category,archived) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,title=excluded.title,description=excluded.description,image_url=excluded.image_url,instructor=excluded.instructor,level=excluded.level,published=excluded.published,sort_order=excluded.sort_order,category=excluded.category,archived=excluded.archived",
			)
			.bind(
				id,
				c.slug,
				c.title,
				c.description,
				c.imageUrl,
				c.instructor,
				c.level,
				Number(c.published),
				c.sortOrder,
				c.category,
				Number(c.archived),
			)
			.run();
		return { id };
	});
export const saveSection = createServerFn({ method: "POST" })
	.validator(v.sectionInput)
	.handler(async ({ data: s }) => {
		const db = await adminMutation();
		const id = s.id ?? crypto.randomUUID();
		await db
			.prepare(
				"INSERT INTO sections(id,course_id,title,sort_order) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET course_id=excluded.course_id,title=excluded.title,sort_order=excluded.sort_order",
			)
			.bind(id, s.courseId, s.title, s.sortOrder)
			.run();
		return { id };
	});
export const saveLesson = createServerFn({ method: "POST" })
	.validator(v.lessonInput)
	.handler(async ({ data: l }) => {
		const db = await adminMutation();
		const id = l.id ?? crypto.randomUUID();
		await db
			.prepare(
				"INSERT INTO lessons(id,section_id,title,description,video_url,content,duration_seconds,preview,published,sort_order,resource_links) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET section_id=excluded.section_id,title=excluded.title,description=excluded.description,video_url=excluded.video_url,content=excluded.content,duration_seconds=excluded.duration_seconds,preview=excluded.preview,published=excluded.published,sort_order=excluded.sort_order,resource_links=excluded.resource_links",
			)
			.bind(
				id,
				l.sectionId,
				l.title,
				l.description,
				l.videoUrl,
				l.content,
				l.durationSeconds,
				Number(l.preview),
				Number(l.published),
				l.sortOrder,
				l.resourceLinks,
			)
			.run();
		return { id };
	});
export const saveProduct = createServerFn({ method: "POST" })
	.validator(v.productInput)
	.handler(async ({ data: p }) => {
		const db = await adminMutation();
		const id = p.id ?? crypto.randomUUID();
		await db.batch([
			db
				.prepare(
					"INSERT INTO products(id,title,description,price_cents,currency,active) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,price_cents=excluded.price_cents,currency=excluded.currency,active=excluded.active",
				)
				.bind(
					id,
					p.title,
					p.description,
					p.priceCents,
					p.currency,
					Number(p.active),
				),
			db.prepare("DELETE FROM product_courses WHERE product_id=?").bind(id),
			...p.courseIds.map((courseId) =>
				db
					.prepare(
						"INSERT INTO product_courses(product_id,course_id) VALUES (?,?)",
					)
					.bind(id, courseId),
			),
		]);
		return { id };
	});
export const grantAccess = createServerFn({ method: "POST" })
	.validator(v.grantInput)
	.handler(async ({ data: input }) => {
		const db = await adminMutation();
		if (
			!(await db
				.prepare("SELECT id FROM user WHERE id=? AND email_verified=1")
				.bind(input.userId)
				.first())
		)
			throw new Error("A verified user is required.");
		const now = Date.now();
		await db.batch([
			db
				.prepare(
					"INSERT INTO course_access(id,user_id,course_id,source,source_id,created_at) VALUES (?,?,?,'manual','manual',?) ON CONFLICT(user_id,course_id,source,source_id) DO UPDATE SET revoked_at=NULL",
				)
				.bind(crypto.randomUUID(), input.userId, input.courseId, now),
			db
				.prepare(
					"INSERT OR IGNORE INTO enrollments(user_id,course_id,created_at) VALUES (?,?,?)",
				)
				.bind(input.userId, input.courseId, now),
		]);
		return { success: true as const };
	});
export const retryReceipts = createServerFn({ method: "POST" }).handler(
	async () => {
		await adminMutation();
		const { sendReceipt } = await import("./email");
		const pending = await data.rows<{ orderId: string }>(
			"SELECT order_id AS orderId FROM email_outbox WHERE sent_at IS NULL ORDER BY attempts LIMIT 20",
		);
		let sent = 0;
		let failed = 0;
		for (const item of pending) {
			try {
				await sendReceipt(item.orderId);
				sent++;
			} catch {
				failed++;
			}
		}
		return { sent, failed };
	},
);
export const revokeManualAccess = createServerFn({ method: "POST" })
	.validator(v.grantInput)
	.handler(async ({ data: input }) => {
		const db = await adminMutation();
		await db
			.prepare(
				"UPDATE course_access SET revoked_at=? WHERE user_id=? AND course_id=? AND source='manual'",
			)
			.bind(Date.now(), input.userId, input.courseId)
			.run();
		return { success: true };
	});
export const getOperations = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireViewer(true);
		const [receipts, audit, grants] = await Promise.all([
			data.rows<{
				orderId: string;
				recipient: string;
				sentAt: number | null;
				attempts: number;
				lastError: string | null;
				deliveryStatus: string;
			}>(
				"SELECT order_id AS orderId,recipient,sent_at AS sentAt,attempts,last_error AS lastError,delivery_status AS deliveryStatus FROM email_outbox ORDER BY rowid DESC LIMIT 100",
			),
			data.rows<{
				id: string;
				actorId: string;
				action: string;
				entityId: string;
				createdAt: number;
			}>(
				"SELECT id,actor_id AS actorId,action,entity_id AS entityId,created_at AS createdAt FROM audit_log ORDER BY created_at DESC LIMIT 100",
			),
			data.rows<{
				id: string;
				userId: string;
				courseId: string;
				source: string;
				sourceId: string;
				revokedAt: number | null;
			}>(
				"SELECT id,user_id AS userId,course_id AS courseId,source,source_id AS sourceId,revoked_at AS revokedAt FROM course_access ORDER BY created_at DESC LIMIT 100",
			),
		]);
		return { receipts, audit, grants };
	},
);
export const reorderContent = createServerFn({ method: "POST" })
	.validator(v.reorderInput)
	.handler(async ({ data: input }) => {
		const db = await adminMutation();
		const parentColumn =
			input.kind === "sections"
				? "course_id"
				: input.kind === "lessons"
					? "section_id"
					: null;
		const first = await db
			.prepare(
				`SELECT ${parentColumn ?? "id"} AS parent FROM ${input.kind} WHERE id=?`,
			)
			.bind(input.ids[0])
			.first<{ parent: string }>();
		if (!first) throw new Error("Content not found.");
		const items = await data.rows<{ id: string }>(
			`SELECT id FROM ${input.kind}${parentColumn ? ` WHERE ${parentColumn}=?` : ""}`,
			...(parentColumn ? [first.parent] : []),
		);
		if (
			items.length !== input.ids.length ||
			items.some((item) => !input.ids.includes(item.id))
		)
			throw new Error("Reorder items within the same course or section.");
		await db.batch(
			input.ids.map((id, index) =>
				db
					.prepare(`UPDATE ${input.kind} SET sort_order=? WHERE id=?`)
					.bind(index, id),
			),
		);
		return { success: true };
	});
