import type {
	Course,
	CourseResponse,
	Lesson,
	Order,
	Product,
	Progress,
	Section,
} from "./contracts";
import { runtime } from "./runtime";
export const courseColumns =
	"id, slug, title, description, image_url AS imageUrl, instructor, level, published, sort_order AS sortOrder,category,archived";
export const sectionColumns =
	"id, course_id AS courseId, title, sort_order AS sortOrder";
export const lessonColumns =
	"id, section_id AS sectionId, title, description, video_url AS videoUrl, content, duration_seconds AS durationSeconds, preview, published, sort_order AS sortOrder,resource_links AS resourceLinks, lesson_type AS lessonType, activity, activity_config AS activityConfig";
export const orderColumns =
	"o.id, o.product_id AS productId, o.product_title AS productTitle, o.amount_cents AS amountCents, o.currency, CASE WHEN EXISTS(SELECT 1 FROM order_refunds r WHERE r.order_id=o.id) THEN 'refunded' ELSE o.status END AS status, o.bill_id AS billId, o.payment_url AS paymentUrl, o.created_at AS createdAt, o.paid_at AS paidAt";
export const progressColumns =
	"lesson_id AS lessonId, position_seconds AS positionSeconds, completed, updated_at AS updatedAt";
export async function rows<T>(
	sql: string,
	...params: (string | number | null)[]
): Promise<T[]> {
	return (
		await runtime()
			.db.prepare(sql)
			.bind(...params)
			.all<T>()
	).results;
}
export async function courses(all = false): Promise<Course[]> {
	return (
		await rows<Course>(
			`SELECT ${courseColumns} FROM courses ${all ? "" : "WHERE published = 1 AND archived=0"} ORDER BY sort_order, title`,
		)
	).map((c) => ({
		...c,
		published: Boolean(c.published),
		archived: Boolean(c.archived),
	}));
}
export async function products(all = false): Promise<Product[]> {
	const [products, links] = await Promise.all([
		rows<Omit<Product, "courseIds">>(
			`SELECT id,title,description,price_cents AS priceCents,currency,active FROM products ${all ? "" : "WHERE active = 1"} ORDER BY price_cents`,
		),
		rows<{ productId: string; courseId: string }>(
			"SELECT product_id AS productId, course_id AS courseId FROM product_courses",
		),
	]);
	return products.map((p) => ({
		...p,
		active: Boolean(p.active),
		courseIds: links.filter((l) => l.productId === p.id).map((l) => l.courseId),
	}));
}
export async function sections(
	courseId: string,
	all = false,
): Promise<CourseResponse["sections"]> {
	const [sections, lessons] = await Promise.all([
		rows<Section>(
			`SELECT ${sectionColumns} FROM sections WHERE course_id=? ORDER BY sort_order,id`,
			courseId,
		),
		rows<Omit<Lesson, "videoUrl" | "content" | "resourceLinks" | "activity">>(
			`SELECT l.id,l.section_id AS sectionId,l.title,l.description,l.duration_seconds AS durationSeconds,l.preview,l.published,l.sort_order AS sortOrder,l.lesson_type AS lessonType FROM lessons l JOIN sections s ON s.id=l.section_id WHERE s.course_id=? ${all ? "" : "AND l.published=1"} ORDER BY l.sort_order,l.id`,
			courseId,
		),
	]);
	return sections.map((s) => ({
		...s,
		lessons: lessons
			.filter((l) => l.sectionId === s.id)
			.map((l) => ({
				...l,
				preview: Boolean(l.preview),
				published: Boolean(l.published),
			})),
	}));
}
export async function access(userId: string, courseId: string) {
	return Boolean(
		await runtime()
			.db.prepare(
				"SELECT 1 FROM course_access WHERE user_id=? AND course_id=? AND revoked_at IS NULL",
			)
			.bind(userId, courseId)
			.first(),
	);
}
export async function progress(userId: string): Promise<Progress[]> {
	return (
		await rows<Progress>(
			`SELECT ${progressColumns} FROM progress WHERE user_id=?`,
			userId,
		)
	).map((p) => ({ ...p, completed: Boolean(p.completed) }));
}
export async function orders(userId?: string): Promise<Order[]> {
	return rows<Order>(
		`SELECT ${orderColumns} FROM orders o ${userId ? "WHERE o.user_id=?" : ""} ORDER BY o.created_at DESC LIMIT 500`,
		...(userId ? [userId] : []),
	);
}
