import { z } from "zod";
import { activityIssues } from "../lib/lesson-activity.ts";
import { lessonIssues } from "../lib/lesson-readiness.ts";
import { youtubeId } from "../lib/youtube.ts";

const id = z.string().min(1).max(100);
const title = z.string().trim().min(1).max(200);
const url = z
	.string()
	.url()
	.refine(
		(value) => ["https:", "http:"].includes(new URL(value).protocol),
		"Use an HTTP or HTTPS URL",
	)
	.nullable();
export const courseInput = z.object({
	category: z.string().trim().min(1).max(100).default("General"),
	archived: z.boolean().default(false),
	id: id.optional(),
	slug: z
		.string()
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
		.max(100),
	title,
	description: z.string().max(20000),
	imageUrl: url,
	instructor: z.string().max(200),
	level: z.string().max(100),
	published: z.boolean(),
	sortOrder: z.number().int().min(0),
});
export const sectionInput = z.object({
	id: id.optional(),
	courseId: id,
	title,
	sortOrder: z.number().int().min(0),
});
export const lessonInput = z.object({
	activityConfig: z.string().max(64000).nullable().default(null),
	lessonType: z.enum(["video", "reading", "interactive", "quiz"]),
	activity: z.enum(["ipv4", "private", "subnet", "quiz"]).nullable(),
	resourceLinks: z
		.string()
		.max(4000)
		.default("")
		.refine(
			(value) =>
				value
					.split("\n")
					.filter((line) => line.trim())
					.every((line) => {
						try {
							return new URL(line.trim()).protocol === "https:";
						} catch {
							return false;
						}
					}),
			"Use HTTPS links, one per line.",
		),
	id: id.optional(),
	sectionId: id,
	title,
	description: z.string().max(20000),
	videoUrl: z
		.string()
		.refine((value) => youtubeId(value) !== null, "Enter a valid YouTube URL.")
		.transform((value) => `https://www.youtube.com/watch?v=${youtubeId(value)}`)
		.nullable(),
	content: z.string().max(100000),
	durationSeconds: z.number().int().min(0).max(86400),
	preview: z.boolean(),
	published: z.boolean(),
	sortOrder: z.number().int().min(0),
});
export const publishableLessonInput = lessonInput.superRefine((lesson, ctx) => {
	for (const message of activityIssues(lesson))
		ctx.addIssue({ code: "custom", message, path: ["activityConfig"] });
	if (lesson.published)
		for (const message of lessonIssues(lesson))
			ctx.addIssue({ code: "custom", message, path: ["published"] });
});
export const productInput = z.object({
	id: id.optional(),
	title,
	description: z.string().max(20000),
	priceCents: z.number().int().positive().max(100000000),
	currency: z.literal("MYR").default("MYR"),
	active: z.boolean(),
	courseIds: z
		.array(id)
		.min(1)
		.max(50)
		.refine((ids) => new Set(ids).size === ids.length, "Duplicate courses"),
});
export const courseQuery = z.object({ slug: id });
export const lessonQuery = z.object({ courseSlug: id, lessonId: id });
export const progressInput = z.object({
	lessonId: id,
	positionSeconds: z.number().int().min(0).max(86400),
	completed: z.boolean(),
});
export const checkoutInput = z.object({ productId: id });
export const grantInput = z.object({ userId: id, courseId: id });
export const orderInput = z.object({ orderId: id });
export const refundInput = z.object({
	orderId: id,
	reason: z.string().trim().min(5).max(2000),
});
