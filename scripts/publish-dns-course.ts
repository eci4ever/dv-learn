import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { activitySchema } from "../src/lib/lesson-activity.ts";
import { courseInput, lessonInput, publishableLessonInput, sectionInput } from "../src/server/validation.ts";

const args = new Set(process.argv.slice(2));
const action = ["--validate-only", "--create", "--publish"].filter((arg) => args.has(arg));
if (action.length !== 1 || (!args.has("--validate-only") && args.has("--local") === args.has("--remote")) || [...args].some((arg) => !["--validate-only", "--create", "--publish", "--local", "--remote"].includes(arg)))
  throw new Error("Use --validate-only, or one target (--local/--remote) and one action (--create/--publish). Creation is draft-only; publishing is explicit.");
const bundle = z.object({
  version: z.literal(1), course: courseInput, sections: z.array(sectionInput).min(1),
  lessons: z.array(z.object({
    id: z.string(), sectionId: z.string(), title: z.string(), description: z.string(), content: z.string(),
    minutes: z.number().int().positive(), lessonType: lessonInput.shape.lessonType,
    sources: z.array(z.string().url()), config: activitySchema.optional(),
  }).strict()).min(1),
}).strict().parse(JSON.parse(readFileSync(new URL("../courses/dns-fundamentals/course.json", import.meta.url), "utf8")));
if (bundle.course.id !== "dns-fundamentals" || bundle.course.slug !== "dns-fundamentals" || bundle.course.published)
  throw new Error("Only the reviewed DNS Fundamentals draft manifest is supported.");
const sections = new Set(bundle.sections.map((s) => s.id));
if (sections.size !== bundle.sections.length || bundle.sections.some((s) => s.courseId !== bundle.course.id) || new Set(bundle.lessons.map((l) => l.id)).size !== bundle.lessons.length)
  throw new Error("Invalid record mapping.");
const lessons = bundle.lessons.map((l, index) => publishableLessonInput.parse({
  id: l.id, sectionId: l.sectionId, title: l.title, description: l.description, content: l.content,
  videoUrl: null, activity: null, activityConfig: l.config ? JSON.stringify(l.config) : null,
  lessonType: l.lessonType, durationSeconds: l.minutes * 60, resourceLinks: l.sources.join("\n"),
  preview: true, published: true, sortOrder: index,
}));
if (lessons.some((l) => !sections.has(l.sectionId))) throw new Error("Lesson parent is missing.");
if (args.has("--validate-only")) {
  console.log(JSON.stringify({ valid: true, course: bundle.course.slug, lessons: lessons.length, publicPreviews: lessons.length, minutes: bundle.lessons.reduce((sum, l) => sum + l.minutes, 0) }));
} else {
  const target = args.has("--remote") ? "--remote" : "--local";
  const literal = (value: string | number | null | undefined): string => value == null ? "NULL" : typeof value === "number" ? String(value) : `'${value.replaceAll("'", "''")}'`;
  const execute = (command: string) => z.array(z.object({ success: z.boolean(), results: z.array(z.record(z.string(), z.unknown())) })).parse(JSON.parse(execFileSync(resolve("node_modules/.bin/wrangler"), ["d1", "execute", "dv-learn-db", "--config", "wrangler.jsonc", target, "--command", command, "--yes", "--json"], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 })));
  const course = bundle.course;
  if (args.has("--create")) {
    const ids = [course.id, ...bundle.sections.map((s) => s.id), ...lessons.map((l) => l.id)].map(literal).join(",");
    const preflight = execute(`SELECT id FROM courses WHERE id=${literal(course.id)} OR slug=${literal(course.slug)}; SELECT id FROM sections WHERE id IN (${ids}); SELECT id FROM lessons WHERE id IN (${ids});`);
    if (preflight.some((r) => r.results.length)) throw new Error("Record IDs already exist. Refusing to overwrite existing content.");
    const commands = [`INSERT INTO courses(id,slug,title,description,image_url,instructor,level,published,sort_order,category,archived) VALUES (${[course.id,course.slug,course.title,course.description,course.imageUrl,course.instructor,course.level,0,course.sortOrder,course.category,0].map(literal).join(",")});`];
    for (const s of bundle.sections) commands.push(`INSERT INTO sections(id,course_id,title,sort_order) VALUES (${[s.id,s.courseId,s.title,s.sortOrder].map(literal).join(",")});`);
    for (const l of lessons) commands.push(`INSERT INTO lessons(id,section_id,title,description,video_url,content,duration_seconds,preview,published,sort_order,resource_links,lesson_type,activity,activity_config) VALUES (${[l.id,l.sectionId,l.title,l.description,null,l.content,l.durationSeconds,1,0,l.sortOrder,l.resourceLinks,l.lessonType,null,l.activityConfig].map(literal).join(",")});`);
    const result = execute(commands.join("\n"));
    if (result.some((r) => !r.success)) throw new Error("Draft import failed.");
    console.log(JSON.stringify({ target, createdDraft: course.slug, lessons: lessons.length, published: false }));
  } else {
    // Validate the actual stored content, not merely the manifest, before changing visibility.
    const actual = execute(`SELECT id,slug,title,description,archived FROM courses WHERE id=${literal(course.id)}; SELECT l.id,l.section_id AS sectionId,l.title,l.description,l.video_url AS videoUrl,l.content,l.duration_seconds AS durationSeconds,l.preview,l.published,l.sort_order AS sortOrder,l.resource_links AS resourceLinks,l.lesson_type AS lessonType,l.activity,l.activity_config AS activityConfig FROM lessons l JOIN sections s ON s.id=l.section_id WHERE s.course_id=${literal(course.id)};`);
    const stored = actual[0].results[0];
    if (!stored || stored.slug !== course.slug || stored.archived || !stored.title || !stored.description || actual[1].results.length !== lessons.length) throw new Error("Course is missing, archived or incomplete.");
    const lessonIds = new Set(lessons.map((l) => l.id));
    for (const row of actual[1].results) {
      const l = publishableLessonInput.parse({ ...row, preview: Boolean(row.preview), published: true });
      if (!lessonIds.has(l.id) || !l.preview || !sections.has(l.sectionId)) throw new Error("Unexpected lesson or access policy; refusing to publish.");
    }
    const result = execute(`UPDATE lessons SET published=1 WHERE id IN (${lessons.map((l) => literal(l.id)).join(",")}); UPDATE courses SET published=1 WHERE id=${literal(course.id)};`);
    if (result.some((r) => !r.success)) throw new Error("Publish failed.");
    console.log(JSON.stringify({ target, published: course.slug, freeLessons: lessons.length, url: "https://learn.nimfi.dev/courses/dns-fundamentals" }));
  }
}
