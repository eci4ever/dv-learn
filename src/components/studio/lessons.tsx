import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { activityExample } from "../../lib/activity-examples";
import { parseActivity } from "../../lib/lesson-activity";
import type { LessonInput } from "../../server/contracts";
import { saveLesson } from "../../server/functions";
import * as api from "../../server/studio";
import * as validation from "../../server/validation";
import { useActionDialog } from "../action-dialog";
import { Input } from "../ui/input";
import { NativeSelect, NativeSelectOption } from "../ui/native-select";
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
import { LessonPreview } from "./lesson-preview";
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
				This lesson belongs to another course. Open it from that course.
			</p>
		);
	const initial: LessonInput | undefined =
		isNew && parent
			? {
					sectionId: parent.id,
					lessonType: "reading",
					activity: null,
					activityConfig: null,
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
					Courses
				</Link>{" "}
				/{" "}
				<Link
					to="/admin/courses/$courseId"
					params={{ courseId }}
					search={api.studioSearch.parse({ tab: "content" })}
				>
					{query.data?.course.title ?? "Course content"}
				</Link>{" "}
				/ {parent?.title ?? "Section"} /{" "}
				{isNew ? "New lesson" : query.data?.lesson.title}
			</nav>
			<h2>
				{isNew ? "New lesson" : (query.data?.lesson.title ?? "Lesson editor")}
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
						"Move this lesson to another section? It will be placed last. If the course changes, access will follow the destination course.",
				}))
			)
				throw new Error("Move cancelled.");
			const result = await saveLesson({
				data: { ...value, id: record.current },
			});
			record.current = result.id;
			return result;
		},
		(value) => [
			["studio", "publish-checklist"],
			...(value.sectionId === initial.sectionId
				? [keys.detail("lesson", initial.id ?? "new")]
				: []),
			keys.lessons(initial.sectionId),
			keys.lessons(value.sectionId),
			keys.sections(courseId),
			keys.sections(destinationCourse),
		],
		validation.publishableLessonInput,
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
			<Field name="lessonType" label="Lesson type">
				<NativeSelect
					value={l.lessonType}
					onChange={(e) => {
						const type = validation.lessonInput.shape.lessonType.parse(
							e.target.value,
						);
						setValue({
							...l,
							lessonType: type,
							activityConfig: null,
							activity:
								type === "quiz"
									? "quiz"
									: type === "interactive"
										? "ipv4"
										: null,
							videoUrl: type === "video" ? l.videoUrl : null,
						});
					}}
				>
					<NativeSelectOption value="video">Video</NativeSelectOption>
					<NativeSelectOption value="reading">Reading</NativeSelectOption>
					<NativeSelectOption value="interactive">
						Interactive
					</NativeSelectOption>
					<NativeSelectOption value="quiz">Quiz</NativeSelectOption>
				</NativeSelect>
			</Field>
			{l.lessonType === "interactive" && (
				<Field name="activity" label="Interactive activity">
					<NativeSelect
						value={
							parseActivity(l.activityConfig)?.kind ??
							(l.activityConfig ? "invalid-config" : (l.activity ?? "ipv4"))
						}
						onChange={(e) => {
							const selected = e.target.value;
							if (
								selected === "dns-resolution" ||
								selected === "dns-records" ||
								selected === "dns-cache"
							)
								setValue({
									...l,
									activity: null,
									activityConfig: JSON.stringify(
										activityExample(selected),
										null,
										2,
									),
								});
							else
								setValue({
									...l,
									activity:
										validation.lessonInput.shape.activity.parse(selected),
									activityConfig: null,
								});
						}}
					>
						{l.activityConfig && !parseActivity(l.activityConfig) && (
							<NativeSelectOption value="invalid-config" disabled>
								Configured activity — fix JSON below
							</NativeSelectOption>
						)}
						<NativeSelectOption value="ipv4">
							IPv4 and binary
						</NativeSelectOption>
						<NativeSelectOption value="private">
							Private IP ranges
						</NativeSelectOption>
						<NativeSelectOption value="subnet">
							Subnet and CIDR
						</NativeSelectOption>
						<NativeSelectOption value="dns-resolution">
							DNS lookup walkthrough
						</NativeSelectOption>
						<NativeSelectOption value="dns-records">
							DNS record practice
						</NativeSelectOption>
						<NativeSelectOption value="dns-cache">
							DNS cache timeline
						</NativeSelectOption>
					</NativeSelect>
				</Field>
			)}
			{l.lessonType === "quiz" && (
				<Field name="activity" label="Quiz activity">
					<NativeSelect
						value={l.activityConfig ? "practice-quiz" : "quiz"}
						onChange={(e) =>
							setValue(
								e.target.value === "practice-quiz"
									? {
											...l,
											activity: null,
											activityConfig: JSON.stringify(
												activityExample("practice-quiz"),
												null,
												2,
											),
										}
									: { ...l, activity: "quiz", activityConfig: null },
							)
						}
					>
						<NativeSelectOption value="quiz">
							Legacy IP quiz (five fixed questions)
						</NativeSelectOption>
						<NativeSelectOption value="practice-quiz">
							Configurable practice quiz
						</NativeSelectOption>
					</NativeSelect>
				</Field>
			)}
			{l.activityConfig != null && (
				<>
					<Field
						name="activityConfig"
						label="Activity configuration (version 1 JSON)"
					>
						<Textarea
							className="min-h-64 font-mono text-sm"
							rows={14}
							maxLength={64000}
							value={l.activityConfig}
							onChange={(e) => set("activityConfig", e.target.value)}
						/>
					</Field>
					<p className="text-muted-foreground">
						Edit prompts, stable IDs, hints and answers. Preview before saving.
						Practice data is client-visible; answers and scores are not stored
						or used to unlock access.
					</p>
				</>
			)}
			<Field name="title" label="Lesson title">
				<Input
					required
					maxLength={200}
					value={l.title}
					onChange={(e) => set("title", e.target.value)}
				/>
			</Field>
			<Field name="description" label="Description">
				<Textarea
					maxLength={20000}
					value={l.description}
					onChange={(e) => set("description", e.target.value)}
				/>
			</Field>
			{l.lessonType === "video" && (
				<Field name="videoUrl" label="YouTube video URL">
					<Input
						type="url"
						value={l.videoUrl ?? ""}
						onChange={(e) => set("videoUrl", e.target.value || null)}
					/>
				</Field>
			)}
			<Field
				name="content"
				label={l.lessonType === "reading" ? "Reading content" : "Lesson notes"}
			>
				<Textarea
					className="min-h-64 resize-y [field-sizing:fixed]"
					aria-describedby="lesson-code-format-help"
					rows={12}
					maxLength={100000}
					value={l.content}
					onChange={(e) => set("content", e.target.value)}
				/>
			</Field>
			<p id="lesson-code-format-help" className="text-sm text-muted-foreground">
				Use backticks for inline code. For a code block, put three backticks and
				a language such as bash, json or js on a new line, then close with three
				backticks on another line. Code is displayed, not run.
			</p>
			<Field
				name="resourceLinks"
				label="Resource links (one HTTPS URL per line)"
			>
				<Textarea
					rows={3}
					maxLength={4000}
					value={l.resourceLinks}
					onChange={(e) => set("resourceLinks", e.target.value)}
				/>
			</Field>
			<Field name="durationSeconds" label="Duration (seconds)">
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
				label="Free preview"
				checked={l.preview}
				onChange={(v) => set("preview", v)}
			/>
			<Toggle
				label="Published"
				checked={l.published}
				onChange={(v) => set("published", v)}
			/>
			<LessonPreview lesson={l} />
			{initial.id && (
				<details className="rounded-lg border border-border bg-muted p-4 text-foreground">
					<summary className="cursor-pointer min-h-8">
						Move to another section or course
					</summary>
					<div className="grid gap-4 mt-4">
						<ParentPicker
							kind="courses"
							label="Destination course"
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
							label="Parent section"
							value={[l.sectionId]}
							onChange={(ids) => set("sectionId", ids[0])}
						/>
					</div>
				</details>
			)}
			<EditorActions editor={editor} />
			{!l.sectionId && (
				<p role="alert">
					Select a section in the destination course before saving.
				</p>
			)}
		</EditorForm>
	);
}
