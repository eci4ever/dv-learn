import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { LessonInput } from "../../server/contracts";
import { saveLesson } from "../../server/functions";
import * as api from "../../server/studio";
import * as validation from "../../server/validation";
import { useActionDialog } from "../action-dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
	EditorActions,
	EditorForm,
	Field,
	keys,
	QueryState,
	Toggle,
	useCreatedNavigation,
	useEditor,
} from "./common";
import { LessonList } from "./courses";
import { ParentPicker } from "./picker";

export function LessonPage() {
	const { courseId = "", lessonId = "" } = useParams({ strict: false });
	const isNew = lessonId.startsWith("new-");
	const sectionId = isNew ? lessonId.slice(4) : "";
	const query = useQuery({
		queryKey: [...keys.detail("lesson", lessonId), courseId],
		queryFn: () => api.getAdminLesson({ data: { id: lessonId } }),
		enabled: !isNew,
	});
	const section = useQuery({
		queryKey: keys.detail("section", sectionId),
		queryFn: () => api.getAdminSection({ data: { id: sectionId } }),
		enabled: isNew,
	});
	const parent = query.data?.section ?? section.data;
	if (parent && parent.courseId !== courseId)
		return (
			<p role="alert">
				Pelajaran tidak berada dalam kursus ini. Buka melalui kursus yang betul.
			</p>
		);
	const initial: LessonInput | undefined =
		isNew && parent
			? {
					sectionId: parent.id,
					title: "",
					description: "",
					videoUrl: null,
					content: "",
					resourceLinks: "",
					durationSeconds: 0,
					sortOrder: 0,
					preview: false,
					published: false,
				}
			: query.data?.lesson;
	return (
		<section className="grid gap-5">
			<nav aria-label="Breadcrumb">
				<Link search={api.studioSearch.parse({})} to="/admin/courses">
					Kursus
				</Link>{" "}
				/{" "}
				<Link
					to="/admin/courses/$courseId"
					params={{ courseId }}
					search={api.studioSearch.parse({ tab: "content" })}
				>
					{query.data?.course.title ?? "Kandungan kursus"}
				</Link>{" "}
				/ {parent?.title ?? "Seksyen"} /{" "}
				{isNew ? "Pelajaran baharu" : query.data?.lesson.title}
			</nav>
			<h2>
				{isNew
					? "Pelajaran baharu"
					: (query.data?.lesson.title ?? "Editor pelajaran")}
			</h2>
			<QueryState query={isNew ? section : query} />
			{initial && parent && (
				<div className="grid gap-6 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
					<aside className="hidden lg:block min-w-0 rounded-lg border p-4 self-start">
						<h3 className="mb-4">{parent.title}</h3>
						<LessonList section={parent} selected={lessonId} />
					</aside>
					<LessonForm
						key={`${courseId}-${lessonId}`}
						initial={initial}
						courseId={courseId}
					/>
				</div>
			)}
		</section>
	);
}
function LessonForm({
	initial,
	courseId,
}: {
	initial: LessonInput;
	courseId: string;
}) {
	const record = useRef(initial.id);
	const [destinationCourse, setDestinationCourse] = useState(courseId);
	const { confirmAction, actionDialog } = useActionDialog();
	const editor = useEditor(
		initial,
		async (value) => {
			if (
				initial.id &&
				initial.sectionId !== value.sectionId &&
				!(await confirmAction({
					description:
						"Pindahkan pelajaran ke seksyen baharu? Turutan akan diletakkan di hujung seksyen. Jika kursus berubah, akses mengikuti kursus baharu.",
				}))
			)
				throw new Error("Perpindahan dibatalkan.");
			const result = await saveLesson({
				data: { ...value, id: record.current },
			});
			record.current = result.id;
			return result;
		},
		(value) => [
			...(value.sectionId === initial.sectionId
				? [keys.detail("lesson", initial.id ?? "new")]
				: []),
			keys.lessons(initial.sectionId),
			keys.lessons(value.sectionId),
			keys.sections(courseId),
			keys.sections(destinationCourse),
		],
		validation.lessonInput,
	);
	const { value: l, setValue } = editor;
	useCreatedNavigation(
		"lesson",
		initial.sectionId !== l.sectionId ? undefined : initial.id,
		editor,
		destinationCourse,
	);
	const set = <K extends keyof LessonInput>(key: K, value: LessonInput[K]) =>
		setValue({ ...l, [key]: value });
	return (
		<EditorForm editor={editor}>
			{actionDialog}
			<Field name="title" label="Tajuk pelajaran">
				<Input
					required
					maxLength={200}
					value={l.title}
					onChange={(e) => set("title", e.target.value)}
				/>
			</Field>
			<Field name="description" label="Penerangan">
				<Textarea
					maxLength={20000}
					value={l.description}
					onChange={(e) => set("description", e.target.value)}
				/>
			</Field>
			<Field name="videoUrl" label="URL video YouTube">
				<Input
					type="url"
					value={l.videoUrl ?? ""}
					onChange={(e) => set("videoUrl", e.target.value || null)}
				/>
			</Field>
			<Field name="content" label="Nota pelajaran">
				<Textarea
					className="min-h-64 resize-y [field-sizing:fixed]"
					rows={12}
					maxLength={100000}
					value={l.content}
					onChange={(e) => set("content", e.target.value)}
				/>
			</Field>
			<Field
				name="resourceLinks"
				label="Resource links (satu URL HTTPS setiap baris)"
			>
				<Textarea
					rows={3}
					maxLength={4000}
					value={l.resourceLinks}
					onChange={(e) => set("resourceLinks", e.target.value)}
				/>
			</Field>
			<Field name="durationSeconds" label="Durasi (saat)">
				<Input
					type="number"
					min={0}
					max={86400}
					required
					value={l.durationSeconds}
					onChange={(e) => set("durationSeconds", e.target.valueAsNumber || 0)}
				/>
			</Field>
			<Toggle
				label="Preview percuma"
				checked={l.preview}
				onChange={(v) => set("preview", v)}
			/>
			<Toggle
				label="Diterbitkan"
				checked={l.published}
				onChange={(v) => set("published", v)}
			/>
			{initial.id && (
				<details className="rounded-lg border p-4">
					<summary className="cursor-pointer min-h-8">
						Pindahkan ke seksyen/kursus lain
					</summary>
					<div className="grid gap-4 mt-4">
						<ParentPicker
							kind="courses"
							label="Kursus destinasi"
							value={[destinationCourse]}
							onChange={(ids) => {
								if (ids[0] !== destinationCourse) {
									setDestinationCourse(ids[0]);
									set("sectionId", "");
								}
							}}
						/>
						<ParentPicker
							kind="sections"
							name="sectionId"
							parentId={destinationCourse}
							label="Seksyen parent"
							value={[l.sectionId]}
							onChange={(ids) => set("sectionId", ids[0])}
						/>
					</div>
				</details>
			)}
			<EditorActions editor={editor} />
			{!l.sectionId && (
				<p role="alert">
					Pilih seksyen dalam kursus destinasi sebelum menyimpan.
				</p>
			)}
		</EditorForm>
	);
}
