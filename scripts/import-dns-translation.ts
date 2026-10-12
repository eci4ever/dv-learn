import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { activityTranslationMatches, courseSource, lessonSource, translatedCourse, translatedLesson, translatedSection } from "../src/lib/course-translation.ts";
import { activitySchema } from "../src/lib/lesson-activity.ts";

const args=new Set(process.argv.slice(2));
if ([...args].some((arg)=>!["--validate-only","--local","--remote","--replace"].includes(arg)) || (!args.has("--validate-only") && args.has("--local")===args.has("--remote"))) throw new Error("Use --validate-only, or --local/--remote (optionally --replace). Remote writes require owner authorization.");
const bundleSchema=z.object({version:z.literal(1),course:z.object({id:z.literal("dns-fundamentals"),slug:z.literal("dns-fundamentals"),title:z.string(),description:z.string(),level:z.string(),contentLanguage:z.enum(["en","ms"])}).passthrough(),sections:z.array(z.object({id:z.string(),courseId:z.literal("dns-fundamentals"),title:z.string()}).passthrough()),lessons:z.array(z.object({id:z.string(),sectionId:z.string(),title:z.string(),description:z.string(),content:z.string(),lessonType:z.string(),minutes:z.number(),sources:z.array(z.string().url()),config:activitySchema.optional()}).passthrough())});
const original=bundleSchema.parse(JSON.parse(readFileSync(new URL("../courses/dns-fundamentals/course.json",import.meta.url),"utf8")));
const translated=bundleSchema.parse(JSON.parse(readFileSync(new URL("../courses/dns-fundamentals/course.ms.json",import.meta.url),"utf8")));
if (translated.course.contentLanguage!=="ms" || translated.sections.length!==original.sections.length || translated.lessons.length!==original.lessons.length) throw new Error("Translation mapping does not match the English course.");
translatedCourse.parse({title:translated.course.title,description:translated.course.description,level:translated.course.level});
for (const [index,lesson] of translated.lessons.entries()) {
	const source=original.lessons[index];
	if (lesson.id!==source.id || lesson.sectionId!==source.sectionId || lesson.lessonType!==source.lessonType || lesson.minutes!==source.minutes || JSON.stringify(lesson.sources)!==JSON.stringify(source.sources) || !activityTranslationMatches(source.config ? JSON.stringify(source.config):null,lesson.config ? JSON.stringify(lesson.config):null)) throw new Error(`Translation changes mapping or grading: ${lesson.id}`);
	translatedLesson.parse({...lessonSource(lesson),activityConfig:lesson.config ? JSON.stringify(lesson.config):null});
}
for (const [index,section] of translated.sections.entries()) { if (section.id!==original.sections[index].id) throw new Error("Section mapping differs"); translatedSection.parse({title:section.title}); }
if (args.has("--validate-only")) {
	console.log(JSON.stringify({valid:true,locale:"ms",lessons:translated.lessons.length,gradingUnchanged:true}));
} else {
	const execute=(command:string)=>JSON.parse(execFileSync(resolve("node_modules/.bin/wrangler"),["d1","execute","DB","--config","wrangler.jsonc",args.has("--remote")?"--remote":"--local","--command",command,"--json"],{encoding:"utf8",maxBuffer:4*1024*1024}));
	const q=(value:string)=>`'${value.replaceAll("'","''")}'`;
	const result=execute("SELECT id,title,description,level,content_language AS contentLanguage FROM courses WHERE id='dns-fundamentals' AND slug='dns-fundamentals'; SELECT id,title FROM sections WHERE course_id='dns-fundamentals'; SELECT l.id,l.section_id AS sectionId,l.title,l.description,l.content,l.lesson_type AS lessonType,l.activity_config AS activityConfig FROM lessons l JOIN sections s ON s.id=l.section_id WHERE s.course_id='dns-fundamentals'; SELECT course_id FROM course_translations WHERE course_id='dns-fundamentals' AND locale='ms';");
	if (result[0].results.length!==1 || result[1].results.length!==translated.sections.length || result[2].results.length!==translated.lessons.length) throw new Error("Stored course mapping is missing or different; nothing imported.");
	if (result[3].results.length && !args.has("--replace")) throw new Error("Translation already exists; review the source changes and use --replace explicitly.");
	const statements:string[]=[];
	const insert=(table:string,column:string,id:string,source:unknown,payload:unknown)=>statements.push(`INSERT INTO ${table}(${column},locale,source,payload) VALUES (${q(id)},'ms',${q(JSON.stringify(source))},${q(JSON.stringify(payload))}) ON CONFLICT(${column},locale) DO UPDATE SET source=excluded.source,payload=excluded.payload;`);
	insert("course_translations","course_id","dns-fundamentals",courseSource(result[0].results[0]),{title:translated.course.title,description:translated.course.description,level:translated.course.level});
	for (const section of translated.sections) {
		const source=result[1].results.find((row:{id:string})=>row.id===section.id);
		if (!source) throw new Error("Stored section differs; nothing imported.");
		insert("section_translations","section_id",section.id,{title:source.title},{title:section.title});
	}
	for (const lesson of translated.lessons) {
		const source=result[2].results.find((row:{id:string})=>row.id===lesson.id);
		const config=lesson.config ? JSON.stringify(lesson.config):null;
		if (!source || source.sectionId!==lesson.sectionId || source.lessonType!==lesson.lessonType || !activityTranslationMatches(source.activityConfig,config)) throw new Error("Stored activity differs; nothing imported.");
		insert("lesson_translations","lesson_id",lesson.id,lessonSource(source),{title:lesson.title,description:lesson.description,content:lesson.content,activityConfig:config});
	}
	const write=execute(statements.join("\n"));
	if (write.some((row:{success:boolean})=>!row.success)) throw new Error("Translation import failed");
	console.log(JSON.stringify({target:args.has("--remote")?"remote":"local",locale:"ms",lessons:translated.lessons.length,originalUnchanged:true}));
}
