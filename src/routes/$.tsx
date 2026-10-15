import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFoundPage } from "../components/not-found";
import { PlatformPage } from "../components/platform";
import { guardPlatformRoute } from "../lib/platform-guard";
import { jsonLd, localizedHref, publicHead, siteOrigin } from "../lib/seo";
import * as m from "../paraglide/messages.js";
import { getLocale } from "../paraglide/runtime.js";
import { getCourse, getLesson } from "../server/functions";
export const Route = createFileRoute("/$")({
	beforeLoad: ({ location }) => guardPlatformRoute(location.pathname),
	loader: async ({ location, context }) => {
		const parts = location.pathname.split("/").filter(Boolean);
		if (parts[0] === "courses" && parts.length === 2) {
			try {
				const result = await context.queryClient.fetchQuery({
					queryKey: ["course", parts[1], getLocale()],
					queryFn: () => getCourse({ data: { slug: parts[1] } }),
				});
				return {
					title: result.course.title,
					description: result.course.description,
					course: result.course,
				};
			} catch (error) {
				if (error instanceof Error && error.message === "Course not found.")
					throw notFound();
				throw error;
			}
		}
		const accountPages = [
			"login",
			"register",
			"forgot-password",
			"reset-password",
			"verify-email",
			"dashboard",
			"orders",
			"settings",
		];
		if (parts[0] === "learn" && parts.length === 3) {
			try {
				await context.queryClient.fetchQuery({
					queryKey: ["lesson", parts[1], parts[2]],
					queryFn: () =>
						getLesson({ data: { courseSlug: parts[1], lessonId: parts[2] } }),
					retry: false,
				});
			} catch (error) {
				if (
					error instanceof Error &&
					["Course not found.", "Lesson not found."].includes(error.message)
				)
					throw notFound();
				// Preserve the existing sign-in / access error view for locked lessons.
				if (
					!(error instanceof Error) ||
					![
						"Please verify your email to continue.",
						"Purchase this course to access this lesson.",
					].includes(error.message)
				)
					throw error;
			}
		}
		if (
			!(parts.length === 1 && accountPages.includes(parts[0])) &&
			!(parts[0] === "learn" && parts.length === 3)
		)
			throw notFound();
		return {
			title: m.learner_learning_space(),
			description: m.learner_your_learning_space(),
			course: null,
		};
	},
	head: ({ loaderData }) => {
		const course = loaderData?.course;
		if (!course?.published || course.archived)
			return {
				meta: [
					{ title: loaderData ? `${loaderData.title} — DV Learn` : "DV Learn" },
					{ name: "robots", content: "noindex, follow" },
				],
			};
		const locale = course.contentLanguage ?? "en";
		const path = `/courses/${encodeURIComponent(course.slug)}`;
		return {
			...publicHead({
				title: `${course.title} — DV Learn`,
				description: course.description,
				path,
				locale,
				languages: course.availableContentLanguages ?? [locale],
				course: true,
			}),
			scripts: [
				{
					type: "application/ld+json",
					children: jsonLd({
						"@context": "https://schema.org",
						"@type": "Course",
						name: course.title,
						description: course.description,
						url: siteOrigin + localizedHref(path, locale),
						inLanguage: locale,
						provider: {
							"@type": "Organization",
							name: "DV Learn",
							url: siteOrigin,
						},
					}),
				},
			],
		};
	},
	component: PlatformPage,
	notFoundComponent: NotFoundPage,
});
