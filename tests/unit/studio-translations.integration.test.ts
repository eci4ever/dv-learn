import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { activityExample } from "../../src/lib/activity-examples";
import {
	activityTextFields,
	setActivityText,
} from "../../src/lib/studio-translation";
import { sqliteD1 } from "./sqlite-d1";

const state = vi.hoisted(() => ({
	runtime: null as unknown,
	role: "admin",
	origin: true,
}));
vi.mock("../../src/server/runtime", () => ({ runtime: () => state.runtime }));
vi.mock("../../src/server/auth", () => ({
	requireViewer: async (admin: boolean) => {
		if (!state.role || (admin && state.role !== "admin"))
			throw Error("Forbidden");
		return { id: "admin" };
	},
	requireSameOrigin: () => {
		if (!state.origin) throw Error("Origin mismatch");
	},
}));
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeader: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		let schema: { parse: (input: unknown) => unknown };
		const builder = {
			validator: (next: typeof schema) => {
				schema = next;
				return builder;
			},
			handler:
				(fn: (input: { data: unknown }) => unknown) =>
				(input: { data: unknown }) =>
					fn({ data: schema.parse(input.data) }),
		};
		return builder;
	},
}));

import {
	getAdminTranslation,
	listAdminTranslations,
	saveAdminTranslation,
} from "../../src/server/studio-translations";

let fixture: ReturnType<typeof sqliteD1>;
const quiz = JSON.stringify(activityExample("practice-quiz"));
beforeEach(() => {
	fixture = sqliteD1();
	state.runtime = { db: fixture.db };
	state.role = "admin";
	state.origin = true;
	fixture.sqlite.exec(
		"INSERT INTO user(id,name,email,email_verified,role,created_at,updated_at) VALUES ('admin','Admin','admin@example.test',1,'admin',0,0); INSERT INTO courses(id,slug,title,description,level,published) VALUES ('c','c','Original course','Original description','Beginner',1),('other','other','Other','Other description','Beginner',0); INSERT INTO sections(id,course_id,title) VALUES ('s','c','Original section'),('other','other','Other section'); INSERT INTO lessons(id,section_id,title,description,content,lesson_type,published,preview) VALUES ('l','s','Original lesson','Original summary','Original content','reading',1,1),('other','other','Other lesson','','Other content','reading',0,0);",
	);
	fixture.sqlite
		.prepare(
			"INSERT INTO lessons(id,section_id,title,content,lesson_type,activity_config,published,preview) VALUES ('quiz','s','Original quiz','Quiz notes','quiz',?,1,1)",
		)
		.run(quiz);
});
afterEach(() => fixture.sqlite.close());

it("finds literal long and multibyte lesson titles without a LIKE pattern", async () => {
	for (const term of [`NETWORK-${"x".repeat(70)}%_`, "网".repeat(30)]) {
		fixture.sqlite.prepare("UPDATE lessons SET title=? WHERE id='l'").run(term);
		const result = await listAdminTranslations({
			data: { courseId: "c", kind: "lesson", q: term.toLowerCase() },
		});
		expect(result.items.map((item) => item.id)).toEqual(["l"]);
		expect(result.total).toBe(1);
	}
	expect(
		(
			await listAdminTranslations({
				data: { courseId: "other", kind: "lesson", q: "网".repeat(30) },
			})
		).total,
	).toBe(0);
});
const key = { courseId: "c", kind: "course" as const, id: "c" };
const courseCopy = {
	title: "Kursus baharu",
	description: "Penerangan kursus",
	level: "Pemula",
};

it("saves a scoped translation, refreshes versions and preserves original identity/publication", async () => {
	const initial = await getAdminTranslation({ data: key });
	expect(initial.status).toBe("missing");
	expect(initial.locale).toBe("ms");
	await saveAdminTranslation({
		data: {
			...key,
			sourceVersion: initial.sourceVersion,
			translationVersion: initial.translationVersion,
			payload: courseCopy,
		},
	});
	const saved = await getAdminTranslation({ data: key });
	expect(saved.status).toBe("ready");
	expect(saved.payload).toEqual(courseCopy);
	expect(saved.translationVersion).not.toBeNull();
	expect(
		fixture.sqlite
			.prepare("SELECT title,published FROM courses WHERE id='c'")
			.get(),
	).toEqual(
		expect.objectContaining({ title: "Original course", published: 1 }),
	);
	await saveAdminTranslation({
		data: {
			...key,
			sourceVersion: saved.sourceVersion,
			translationVersion: saved.translationVersion,
			payload: { ...courseCopy, title: "Kursus disemak" },
		},
	});
	expect((await getAdminTranslation({ data: key })).payload?.title).toBe(
		"Kursus disemak",
	);
});

it("rejects stale writers after another administrator saves", async () => {
	const initial = await getAdminTranslation({ data: key });
	const request = {
		...key,
		sourceVersion: initial.sourceVersion,
		translationVersion: initial.translationVersion,
		payload: courseCopy,
	};
	await saveAdminTranslation({ data: request });
	await expect(
		saveAdminTranslation({
			data: { ...request, payload: { ...courseCopy, title: "Lost update" } },
		}),
	).rejects.toThrow("TRANSLATION_CONFLICT");
	expect((await getAdminTranslation({ data: key })).payload?.title).toBe(
		courseCopy.title,
	);
});

it("atomically rejects a source change between the revision check and write", async () => {
	const initial = await getAdminTranslation({ data: key });
	const prepare = fixture.db.prepare.bind(fixture.db);
	const spy = vi.spyOn(fixture.db, "prepare").mockImplementation((sql) => {
		if (sql.startsWith("INSERT INTO course_translations"))
			fixture.sqlite.exec(
				"UPDATE courses SET title='Concurrent original' WHERE id='c'",
			);
		return prepare(sql);
	});
	try {
		await expect(
			saveAdminTranslation({
				data: {
					...key,
					sourceVersion: initial.sourceVersion,
					translationVersion: null,
					payload: courseCopy,
				},
			}),
		).rejects.toThrow("TRANSLATION_CONFLICT");
		expect(
			fixture.sqlite
				.prepare("SELECT COUNT(*) AS total FROM course_translations")
				.get(),
		).toEqual(expect.objectContaining({ total: 0 }));
	} finally {
		spy.mockRestore();
	}
});

it("marks changed source stale and rejects a save based on the old source", async () => {
	const original = await getAdminTranslation({ data: key });
	await saveAdminTranslation({
		data: {
			...key,
			sourceVersion: original.sourceVersion,
			translationVersion: null,
			payload: courseCopy,
		},
	});
	const editor = await getAdminTranslation({ data: key });
	fixture.sqlite.exec(
		"UPDATE courses SET description='New source' WHERE id='c'",
	);
	expect((await getAdminTranslation({ data: key })).status).toBe("stale");
	await expect(
		saveAdminTranslation({
			data: {
				...key,
				sourceVersion: editor.sourceVersion,
				translationVersion: editor.translationVersion,
				payload: courseCopy,
			},
		}),
	).rejects.toThrow("TRANSLATION_CONFLICT");
});

it("enforces admin access, same origin and course ownership on each endpoint", async () => {
	state.role = "user";
	await expect(getAdminTranslation({ data: key })).rejects.toThrow("Forbidden");
	await expect(
		listAdminTranslations({ data: { courseId: "c", kind: "lesson" } }),
	).rejects.toThrow("Forbidden");
	await expect(
		saveAdminTranslation({
			data: {
				...key,
				sourceVersion: "0".repeat(64),
				translationVersion: null,
				payload: courseCopy,
			},
		}),
	).rejects.toThrow("Forbidden");
	state.role = "admin";
	state.origin = false;
	await expect(
		saveAdminTranslation({
			data: {
				...key,
				sourceVersion: "0".repeat(64),
				translationVersion: null,
				payload: courseCopy,
			},
		}),
	).rejects.toThrow("Origin mismatch");
	state.origin = true;
	await expect(
		getAdminTranslation({
			data: { courseId: "c", kind: "lesson", id: "other" },
		}),
	).rejects.toThrow("TRANSLATION_NOT_FOUND");
	await expect(
		getAdminTranslation({
			data: { courseId: "c", kind: "section", id: "other" },
		}),
	).rejects.toThrow("TRANSLATION_NOT_FOUND");
});

it("paginates without exposing the full content of every lesson", async () => {
	for (let i = 0; i < 25; i++)
		fixture.sqlite
			.prepare(
				"INSERT INTO lessons(id,section_id,title,content,lesson_type) VALUES (?,'s',?,'Large source content','reading')",
			)
			.run(`page-${i}`, `Page ${i}`);
	const list = await listAdminTranslations({
		data: { courseId: "c", kind: "lesson", q: "Page", page: 1 },
	});
	expect(list.total).toBe(25);
	expect(list.items).toHaveLength(20);
	expect(list.items[0]).not.toHaveProperty("content");
	expect(
		(
			await listAdminTranslations({
				data: { courseId: "c", kind: "lesson", q: "Page", page: 2 },
			})
		).items,
	).toHaveLength(5);
});

it("translates activity text but rejects changed grading and empty reading content", async () => {
	const quizKey = { courseId: "c", kind: "lesson" as const, id: "quiz" };
	const record = await getAdminTranslation({ data: quizKey });
	const translated = setActivityText(
		quiz,
		["questions", 0, "prompt"],
		"Record manakah menyimpan alamat IPv4?",
	);
	const payload = {
		title: "Kuiz",
		description: "",
		content: "Nota kuiz",
		activityConfig: translated,
	};
	await saveAdminTranslation({
		data: {
			...quizKey,
			sourceVersion: record.sourceVersion,
			translationVersion: null,
			payload,
		},
	});
	const saved = await getAdminTranslation({ data: quizKey });
	expect(saved.status).toBe("ready");
	const changed = JSON.parse(translated);
	changed.questions[0].answerId = "b";
	await expect(
		saveAdminTranslation({
			data: {
				...quizKey,
				sourceVersion: saved.sourceVersion,
				translationVersion: saved.translationVersion,
				payload: { ...payload, activityConfig: JSON.stringify(changed) },
			},
		}),
	).rejects.toThrow("TRANSLATION_ACTIVITY_INVALID");
	expect(
		activityTextFields(quiz).some((field) => field.path.includes("answerId")),
	).toBe(false);
	const empty = setActivityText(quiz, ["title"], "");
	expect(setActivityText(empty, ["title"], "Latihan")).toContain("Latihan");
	const readingKey = { courseId: "c", kind: "lesson" as const, id: "l" };
	const reading = await getAdminTranslation({ data: readingKey });
	await expect(
		saveAdminTranslation({
			data: {
				...readingKey,
				sourceVersion: reading.sourceVersion,
				translationVersion: null,
				payload: {
					title: "Bacaan",
					description: "",
					content: "",
					activityConfig: null,
				},
			},
		}),
	).rejects.toThrow("TRANSLATION_INCOMPLETE");
});

it("supports BM originals with an EN translation without altering content-language", async () => {
	fixture.sqlite.exec("UPDATE courses SET content_language='ms' WHERE id='c'");
	const initial = await getAdminTranslation({ data: key });
	expect(initial.locale).toBe("en");
	await saveAdminTranslation({
		data: {
			...key,
			sourceVersion: initial.sourceVersion,
			translationVersion: null,
			payload: {
				title: "English course",
				description: "English description",
				level: "Beginner",
			},
		},
	});
	expect(
		fixture.sqlite
			.prepare("SELECT locale FROM course_translations WHERE course_id='c'")
			.get(),
	).toEqual(expect.objectContaining({ locale: "en" }));
	expect(
		fixture.sqlite
			.prepare("SELECT content_language FROM courses WHERE id='c'")
			.get(),
	).toEqual(expect.objectContaining({ content_language: "ms" }));
});
