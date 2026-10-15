import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { z } from "zod";
import { course, lessons, sections } from "../courses/computer-number-systems/bundle.ts";
import { publishableLessonInput } from "../src/server/validation.ts";

const args = new Set(process.argv.slice(2));
const actions = ["--validate-only", "--create", "--publish", "--inspect"].filter((arg) => args.has(arg));
if (actions.length !== 1 || (!args.has("--validate-only") && args.has("--local") === args.has("--remote")) || [...args].some((arg) => !["--validate-only", "--create", "--publish", "--inspect", "--local", "--remote"].includes(arg)))
  throw new Error("Use --validate-only, or one target (--local/--remote) and one action (--create/--publish/--inspect). Create never publishes or overwrites.");
if (course.id !== "computer-number-systems" || course.slug !== course.id || course.published || !course.freeEnrollment || lessons.length !== 6 || lessons.some((l) => !l.preview))
  throw new Error("Only the reviewed, free Computer Number Systems bundle is supported.");
const sectionIds = new Set(sections.map((s) => s.id));
if (sections.some((s) => s.courseId !== course.id) || lessons.some((l) => !sectionIds.has(l.sectionId))) throw new Error("Invalid parent mapping");
if (args.has("--validate-only")) {
  console.log(JSON.stringify({ valid: true, slug: course.slug, lessons: lessons.length, freeEnrollment: true, minutes: lessons.reduce((sum, l) => sum + l.durationSeconds / 60, 0) }));
} else {
  const target = args.has("--remote") ? "--remote" : "--local";
  const literal = (value: string | number | boolean | null | undefined): string => value == null ? "NULL" : typeof value === "number" || typeof value === "boolean" ? String(Number(value)) : `'${value.replaceAll("'", "''")}'`;
  const execute = (command: string) => {
    const result = z.array(z.object({ success: z.boolean(), results: z.array(z.record(z.string(), z.unknown())) })).parse(JSON.parse(execFileSync(resolve("node_modules/.bin/wrangler"), ["d1", "execute", "DB", "--config", "wrangler.jsonc", target, "--command", command, "--yes", "--json"], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 })));
    if (result.some((r) => !r.success)) throw new Error("D1 operation failed");
    return result;
  };
  const ids = lessons.map((l) => literal(l.id)).join(",");
  if (args.has("--create")) {
    const existing = execute(`SELECT id FROM courses WHERE id=${literal(course.id)} OR slug=${literal(course.slug)}; SELECT id FROM sections WHERE id IN (${sections.map((s) => literal(s.id)).join(",")}); SELECT id FROM lessons WHERE id IN (${ids});`);
    if (existing.some((r) => r.results.length)) throw new Error("Records already exist. Refusing to overwrite; inspect the target instead.");
    const commands = [`INSERT INTO courses(id,slug,title,description,image_url,instructor,level,published,sort_order,category,archived,free_enrollment,content_language) VALUES (${[course.id,course.slug,course.title,course.description,course.imageUrl,course.instructor,course.level,0,course.sortOrder,course.category,0,1,"en"].map(literal).join(",")});`];
    for (const s of sections) commands.push(`INSERT INTO sections(id,course_id,title,sort_order) VALUES (${[s.id,s.courseId,s.title,s.sortOrder].map(literal).join(",")});`);
    for (const l of lessons) commands.push(`INSERT INTO lessons(id,section_id,title,description,video_url,content,duration_seconds,preview,published,sort_order,resource_links,lesson_type,activity,activity_config) VALUES (${[l.id,l.sectionId,l.title,l.description,null,l.content,l.durationSeconds,1,0,l.sortOrder,l.resourceLinks,l.lessonType,null,l.activityConfig].map(literal).join(",")});`);
    execute(commands.join("\n"));
    console.log(JSON.stringify({ target, createdDraft: course.slug, lessons: lessons.length, published: false }));
  } else {
    const actual = execute(`SELECT id,slug,title,description,archived,free_enrollment,content_language,published FROM courses WHERE id=${literal(course.id)}; SELECT id,course_id,title,sort_order FROM sections WHERE course_id=${literal(course.id)}; SELECT l.id,l.section_id AS sectionId,l.title,l.description,l.video_url AS videoUrl,l.content,l.duration_seconds AS durationSeconds,l.preview,l.published,l.sort_order AS sortOrder,l.resource_links AS resourceLinks,l.lesson_type AS lessonType,l.activity,l.activity_config AS activityConfig FROM lessons l JOIN sections s ON s.id=l.section_id WHERE s.course_id=${literal(course.id)}; SELECT pc.product_id FROM product_courses pc WHERE pc.course_id=${literal(course.id)};`);
    const stored = actual[0].results[0];
    if (!stored || stored.slug !== course.slug || stored.archived || stored.free_enrollment !== 1 || stored.content_language !== "en" || stored.title !== course.title || stored.description !== course.description || actual[1].results.length !== sections.length || actual[2].results.length !== lessons.length || actual[3].results.length)
      throw new Error("Course missing, changed, incomplete or linked to a product. Refusing publication.");
    for (const s of sections) {
      const row = actual[1].results.find((r) => r.id === s.id);
      if (!row || row.course_id !== course.id || row.title !== s.title || row.sort_order !== s.sortOrder) throw new Error("Stored sections differ from reviewed bundle");
    }
    for (const expected of lessons) {
      const row = actual[2].results.find((r) => r.id === expected.id);
      if (!row) throw new Error("Stored lesson missing");
      const parsed = publishableLessonInput.parse({ ...row, preview: Boolean(row.preview), published: true });
      if (JSON.stringify(parsed) !== JSON.stringify(expected)) throw new Error(`Stored lesson differs from reviewed bundle: ${expected.id}`);
    }
    if (args.has("--publish")) {
      execute(`UPDATE lessons SET published=1 WHERE id IN (${ids}) AND section_id IN (SELECT id FROM sections WHERE course_id=${literal(course.id)}); UPDATE courses SET published=1 WHERE id=${literal(course.id)} AND archived=0 AND free_enrollment=1;`);
    }
    console.log(JSON.stringify({ target, verified: course.slug, published: args.has("--publish") || (stored.published === 1 && actual[2].results.every((l) => l.published === 1)), freeLessons: lessons.length, url: `https://learn.nimfi.dev/courses/${course.slug}` }));
  }
}
