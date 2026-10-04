import type { SearchSchemaInput } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMutation } from "./admin.server";
import { auth, requireViewer } from "./auth";
import type { Course, Lesson, Order, Product, Section } from "./contracts";
import * as data from "./data";
import { reconcilePayment } from "./payments";
import { runtime } from "./runtime";
import { orderInput } from "./validation";

export const studioSearch = z.object({
	page: z.coerce.number().int().min(1).max(100000).catch(1),
	q: z.string().trim().max(200).catch(""),
	category: z.string().trim().max(100).catch(""),
	status: z
		.enum([
			"all",
			"draft",
			"published",
			"archived",
			"active",
			"revoked",
			"pending",
			"paid",
			"failed",
			"refunded",
			"sent",
			"unsent",
		])
		.catch("all"),
	source: z.enum(["all", "manual", "order"]).catch("all"),
	tab: z.enum(["info", "content", "orders", "receipts", "audit"]).catch("info"),
	section: z.string().max(100).catch(""),
	lessonPage: z.coerce.number().int().min(1).max(100000).catch(1),
	lessonQ: z.string().trim().max(200).catch(""),
});
export type StudioSearch = z.infer<typeof studioSearch>;
const listInput = z.object({
	page: z.number().int().min(1).max(100000).default(1),
	q: z.string().trim().max(200).default(""),
	category: z.string().trim().max(100).default(""),
	status: studioSearch.shape.status.unwrap().default("all"),
	source: studioSearch.shape.source.unwrap().default("all"),
	tab: studioSearch.shape.tab.unwrap().default("info"),
	section: z.string().max(100).default(""),
	lessonPage: z.number().int().min(1).max(100000).default(1),
	lessonQ: z.string().trim().max(200).default(""),
});
export function parseStudioSearch(
	input: z.input<typeof listInput> & SearchSchemaInput,
) {
	return studioSearch.parse(input);
}
const idInput = z.object({ id: z.string().min(1).max(100) });
const childInput = z.object({
	parentId: z.string().min(1).max(100),
	page: z.number().int().min(1).max(100000).default(1),
	q: z.string().trim().max(200).default(""),
});
export type Page<T> = {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
};
export type CourseSummary = Pick<
	Course,
	"id" | "title" | "slug" | "category" | "published" | "archived" | "sortOrder"
>;
export type LessonSummary = Pick<
	Lesson,
	| "id"
	| "sectionId"
	| "title"
	| "durationSeconds"
	| "preview"
	| "published"
	| "sortOrder"
>;
export type SectionSummary = Section & { lessonCount: number };
export type AccessSummary = {
	id: string;
	userId: string;
	courseId: string;
	email: string;
	courseTitle: string;
	source: string;
	revokedAt: number | null;
};
export type ReceiptSummary = {
	orderId: string;
	recipient: string;
	sentAt: number | null;
	attempts: number;
	lastError: string | null;
	deliveryStatus: string;
};
export type AuditSummary = {
	id: string;
	actorId: string;
	action: string;
	entityId: string;
	createdAt: number;
};
export type AdminOrder = Order & { email: string; userId: string };
type Param = string | number | null;
const like = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`;
async function page<T>(
	select: string,
	from: string,
	where: string[],
	params: Param[],
	order: string,
	current: number,
): Promise<Page<T>> {
	const clause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
	const db = runtime().db;
	const [count, result] = await Promise.all([
		db
			.prepare(`SELECT COUNT(*) AS total FROM ${from}${clause}`)
			.bind(...params)
			.first<{ total: number }>(),
		db
			.prepare(
				`SELECT ${select} FROM ${from}${clause} ORDER BY ${order} LIMIT 20 OFFSET ?`,
			)
			.bind(...params, (current - 1) * 20)
			.all<T>(),
	]);
	return {
		items: result.results,
		total: count?.total ?? 0,
		page: current,
		pageSize: 20,
	};
}
export const listAdminCourses = createServerFn({ method: "GET" })
	.validator(listInput)
	.handler(async ({ data: s }): Promise<Page<CourseSummary>> => {
		await requireViewer(true);
		const where: string[] = [];
		const params: Param[] = [];
		if (s.q) {
			where.push("(title LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\')");
			params.push(like(s.q), like(s.q));
		}
		if (s.category) {
			where.push("category=?");
			params.push(s.category);
		}
		if (s.status === "archived") where.push("archived=1");
		if (s.status === "published") where.push("published=1 AND archived=0");
		if (s.status === "draft") where.push("published=0 AND archived=0");
		const result = await page<CourseSummary>(
			"id,title,slug,category,published,archived,sort_order AS sortOrder",
			"courses",
			where,
			params,
			"sort_order,id",
			s.page,
		);
		return {
			...result,
			items: result.items.map((c) => ({
				...c,
				published: Boolean(c.published),
				archived: Boolean(c.archived),
			})),
		};
	});
export const getAdminCategories = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireViewer(true);
		return data.rows<{ category: string }>(
			"SELECT DISTINCT category FROM courses ORDER BY category",
		);
	},
);
export const getAdminChoiceLabels = createServerFn({ method: "GET" })
	.validator(
		z.object({
			kind: z.enum(["courses", "sections", "users"]),
			ids: z.array(z.string().min(1).max(100)).max(50),
		}),
	)
	.handler(async ({ data: input }) => {
		await requireViewer(true);
		if (!input.ids.length) return [];
		const table = input.kind === "users" ? "user" : input.kind;
		const title = input.kind === "users" ? "name || ' — ' || email" : "title";
		return data.rows<{ id: string; title: string }>(
			`SELECT id,${title} AS title FROM ${table} WHERE id IN (${input.ids.map(() => "?").join(",")})`,
			...input.ids,
		);
	});
export const getAdminCourse = createServerFn({ method: "GET" })
	.validator(idInput)
	.handler(async ({ data: input }): Promise<Course> => {
		await requireViewer(true);
		const [c] = await data.rows<Course>(
			`SELECT ${data.courseColumns} FROM courses WHERE id=?`,
			input.id,
		);
		if (!c) throw new Error("Course not found.");
		return {
			...c,
			published: Boolean(c.published),
			archived: Boolean(c.archived),
		};
	});
export const listAdminSections = createServerFn({ method: "GET" })
	.validator(childInput)
	.handler(async ({ data: s }) => {
		await requireViewer(true);
		return page<SectionSummary>(
			"s.id,s.course_id AS courseId,s.title,s.sort_order AS sortOrder,(SELECT COUNT(*) FROM lessons l WHERE l.section_id=s.id) AS lessonCount",
			"sections s",
			["s.course_id=?", "s.title LIKE ? ESCAPE '\\'"],
			[s.parentId, like(s.q)],
			"s.sort_order,s.id",
			s.page,
		);
	});
export const getAdminSection = createServerFn({ method: "GET" })
	.validator(idInput)
	.handler(async ({ data: input }) => {
		await requireViewer(true);
		const [s] = await data.rows<Section>(
			`SELECT ${data.sectionColumns} FROM sections WHERE id=?`,
			input.id,
		);
		if (!s) throw new Error("Section not found.");
		return s;
	});
export const listAdminLessons = createServerFn({ method: "GET" })
	.validator(childInput)
	.handler(async ({ data: s }): Promise<Page<LessonSummary>> => {
		await requireViewer(true);
		const result = await page<LessonSummary>(
			"id,section_id AS sectionId,title,duration_seconds AS durationSeconds,preview,published,sort_order AS sortOrder",
			"lessons",
			["section_id=?", "title LIKE ? ESCAPE '\\'"],
			[s.parentId, like(s.q)],
			"sort_order,id",
			s.page,
		);
		return {
			...result,
			items: result.items.map((l) => ({
				...l,
				published: Boolean(l.published),
				preview: Boolean(l.preview),
			})),
		};
	});
export const getAdminLesson = createServerFn({ method: "GET" })
	.validator(idInput)
	.handler(async ({ data: input }) => {
		await requireViewer(true);
		const [l] = await data.rows<Lesson>(
			`SELECT ${data.lessonColumns} FROM lessons WHERE id=?`,
			input.id,
		);
		if (!l) throw new Error("Lesson not found.");
		const [section] = await data.rows<Section>(
			`SELECT ${data.sectionColumns} FROM sections WHERE id=?`,
			l.sectionId,
		);
		const [course] = await data.rows<{ id: string; title: string }>(
			"SELECT id,title FROM courses WHERE id=?",
			section.courseId,
		);
		return {
			lesson: {
				...l,
				published: Boolean(l.published),
				preview: Boolean(l.preview),
			},
			section,
			course,
		};
	});
export const listAdminProducts = createServerFn({ method: "GET" })
	.validator(listInput)
	.handler(async ({ data: s }) => {
		await requireViewer(true);
		const where = ["title LIKE ? ESCAPE '\\'"];
		if (s.status === "active") where.push("active=1");
		if (s.status === "draft") where.push("active=0");
		const result = await page<
			Pick<Product, "id" | "title" | "priceCents" | "active">
		>(
			"id,title,price_cents AS priceCents,active",
			"products",
			where,
			[like(s.q)],
			"title,id",
			s.page,
		);
		return {
			...result,
			items: result.items.map((p) => ({ ...p, active: Boolean(p.active) })),
		};
	});
export const getAdminProduct = createServerFn({ method: "GET" })
	.validator(idInput)
	.handler(async ({ data: input }): Promise<Product> => {
		await requireViewer(true);
		const [p] = await data.rows<Omit<Product, "courseIds">>(
			"SELECT id,title,description,price_cents AS priceCents,currency,active FROM products WHERE id=?",
			input.id,
		);
		if (!p) throw new Error("Product not found.");
		const links = await data.rows<{ courseId: string }>(
			"SELECT course_id AS courseId FROM product_courses WHERE product_id=?",
			input.id,
		);
		return {
			...p,
			active: Boolean(p.active),
			courseIds: links.map((l) => l.courseId),
		};
	});
async function userPage(s: StudioSearch) {
	const matches = await page<{ id: string }>(
		"id",
		"user",
		["(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')"],
		[like(s.q), like(s.q)],
		"created_at DESC,id",
		s.page,
	);
	const result = await auth().api.listUsers({
		headers: (await import("@tanstack/react-start/server")).getRequest()
			.headers,
		query: {
			limit: 20,
			filterField: "id",
			filterOperator: "in",
			filterValue: matches.items.length ? matches.items.map((u) => u.id) : [""],
			sortBy: "createdAt",
			sortDirection: "desc",
		},
	});
	return {
		...matches,
		items: matches.items.flatMap((item) => {
			const user = result.users.find((u) => u.id === item.id);
			return user ? [user] : [];
		}),
	};
}
export const listAdminUsers = createServerFn({ method: "GET" })
	.validator(listInput)
	.handler(async ({ data: s }) => {
		await requireViewer(true);
		return userPage(s);
	});
export const listAdminUserChoices = createServerFn({ method: "GET" })
	.validator(listInput)
	.handler(async ({ data: s }) => {
		await requireViewer(true);
		const result = await userPage(s);
		return {
			...result,
			items: result.items.map((u) => ({
				id: u.id,
				title: `${u.name} — ${u.email}`,
			})),
		};
	});
export const listAdminAccess = createServerFn({ method: "GET" })
	.validator(listInput)
	.handler(async ({ data: s }) => {
		await requireViewer(true);
		const where = [
			"(u.email LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\' OR c.title LIKE ? ESCAPE '\\')",
		];
		const params: Param[] = [like(s.q), like(s.q), like(s.q)];
		if (s.source !== "all") {
			where.push("a.source=?");
			params.push(s.source);
		}
		if (s.status === "active") where.push("a.revoked_at IS NULL");
		if (s.status === "revoked") where.push("a.revoked_at IS NOT NULL");
		return page<AccessSummary>(
			"a.id,a.user_id AS userId,a.course_id AS courseId,u.email,c.title AS courseTitle,a.source,a.revoked_at AS revokedAt",
			"course_access a JOIN user u ON u.id=a.user_id JOIN courses c ON c.id=a.course_id",
			where,
			params,
			"a.created_at DESC,a.id",
			s.page,
		);
	});
export const listAdminOrders = createServerFn({ method: "GET" })
	.validator(listInput)
	.handler(async ({ data: s }) => {
		await requireViewer(true);
		const where = [
			"(o.id LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR o.product_title LIKE ? ESCAPE '\\')",
		];
		const params: Param[] = [like(s.q), like(s.q), like(s.q)];
		if (["paid", "pending", "failed", "refunded"].includes(s.status)) {
			where.push(
				"(CASE WHEN EXISTS(SELECT 1 FROM order_refunds r WHERE r.order_id=o.id) THEN 'refunded' ELSE o.status END)=?",
			);
			params.push(s.status);
		}
		return page<AdminOrder>(
			`${data.orderColumns},u.email,o.user_id AS userId`,
			"orders o JOIN user u ON u.id=o.user_id",
			where,
			params,
			"o.created_at DESC,o.id",
			s.page,
		);
	});
export const listAdminReceipts = createServerFn({ method: "GET" })
	.validator(listInput)
	.handler(async ({ data: s }) => {
		await requireViewer(true);
		const where = [
			"(recipient LIKE ? ESCAPE '\\' OR order_id LIKE ? ESCAPE '\\')",
		];
		if (s.status === "sent") where.push("sent_at IS NOT NULL");
		if (s.status === "unsent") where.push("sent_at IS NULL");
		return page<ReceiptSummary>(
			"order_id AS orderId,recipient,sent_at AS sentAt,attempts,last_error AS lastError,delivery_status AS deliveryStatus",
			"email_outbox",
			where,
			[like(s.q), like(s.q)],
			"rowid DESC",
			s.page,
		);
	});
export const listAdminAudit = createServerFn({ method: "GET" })
	.validator(listInput)
	.handler(async ({ data: s }) => {
		await requireViewer(true);
		return page<AuditSummary>(
			"id,actor_id AS actorId,action,entity_id AS entityId,created_at AS createdAt",
			"audit_log",
			[
				"(action LIKE ? ESCAPE '\\' OR actor_id LIKE ? ESCAPE '\\' OR entity_id LIKE ? ESCAPE '\\')",
			],
			[like(s.q), like(s.q), like(s.q)],
			"created_at DESC,id",
			s.page,
		);
	});
export const reconcileAdminOrder = createServerFn({ method: "POST" })
	.validator(orderInput)
	.handler(async ({ data: input }) => {
		await adminMutation();
		return reconcilePayment(await requireViewer(true), input.orderId);
	});
export const getAdminOperationsSummary = createServerFn({
	method: "GET",
}).handler(async () => {
	await requireViewer(true);
	const [summary] = await data.rows<{
		paid: number;
		pending: number;
		revenueCents: number;
		receiptsPending: number;
	}>(
		"SELECT COUNT(CASE WHEN status='paid' AND NOT EXISTS(SELECT 1 FROM order_refunds r WHERE r.order_id=o.id) THEN 1 END) AS paid,COUNT(CASE WHEN status='pending' THEN 1 END) AS pending,COALESCE(SUM(CASE WHEN status='paid' AND NOT EXISTS(SELECT 1 FROM order_refunds r WHERE r.order_id=o.id) THEN amount_cents ELSE 0 END),0) AS revenueCents,(SELECT COUNT(*) FROM email_outbox WHERE sent_at IS NULL) AS receiptsPending FROM orders o",
	);
	return summary;
});
export const moveAdminContent = createServerFn({ method: "POST" })
	.validator(
		z.object({
			kind: z.enum(["courses", "sections", "lessons"]),
			id: z.string().min(1).max(100),
			parentId: z.string().min(1).max(100).optional(),
			direction: z.enum(["up", "down"]),
		}),
	)
	.handler(async ({ data: input }) => {
		const db = await adminMutation();
		const parent =
			input.kind === "sections"
				? "course_id"
				: input.kind === "lessons"
					? "section_id"
					: null;
		if (parent && !input.parentId) throw new Error("A parent is required.");
		const condition = parent ? `${parent}=?` : "1=1";
		const params = parent ? [input.parentId ?? ""] : [];
		const target = await db
			.prepare(`SELECT id FROM ${input.kind} WHERE id=? AND ${condition}`)
			.bind(input.id, ...params)
			.first();
		if (!target) throw new Error("This record does not belong to this group.");
		// One SQL statement: rank every sibling, swap only the adjacent pair, and normalize ties.
		await db
			.prepare(
				`WITH ranked AS MATERIALIZED (SELECT id,ROW_NUMBER() OVER (ORDER BY sort_order,id)-1 AS position FROM ${input.kind} WHERE ${condition}), target AS (SELECT position AS current FROM ranked WHERE id=?) UPDATE ${input.kind} SET sort_order=(SELECT CASE WHEN position=(SELECT current FROM target) AND EXISTS(SELECT 1 FROM ranked WHERE position=(SELECT current FROM target)+?) THEN position+? WHEN position=(SELECT current FROM target)+? THEN position-? ELSE position END FROM ranked WHERE ranked.id=${input.kind}.id) WHERE id IN (SELECT id FROM ranked)`,
			)
			.bind(
				...params,
				input.id,
				...Array(4).fill(input.direction === "up" ? -1 : 1),
			)
			.run();
		return { success: true };
	});
