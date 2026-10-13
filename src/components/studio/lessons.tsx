import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { activityExample } from "../../lib/activity-examples";
import { parseActivity } from "../../lib/lesson-activity";
import * as m from "../../paraglide/messages.js";
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
		return <p role="alert">{m.studio_wrong_lesson()}</p>;
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
			<nav aria-label={m.studio_breadcrumb()}>
				<Link search={api.studioSearch.parse({})} to="/admin/courses">
					{m.studio_courses()}
				</Link>{" "}
				/{" "}
				<Link
					to="/admin/courses/$courseId"
					params={{ courseId }}
					search={api.studioSearch.parse({ tab: "content" })}
				>
					{query.data?.course.title ?? m.studio_course_content()}
				</Link>{" "}
				/ {parent?.title ?? m.studio_section()} /{" "}
				{isNew ? m.studio_new_lesson() : query.data?.lesson.title}
			</nav>
			<h2>
				{isNew
					? m.studio_new_lesson()
					: (query.data?.lesson.title ?? m.studio_lesson_editor())}
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
					description: m.studio_move_lesson_confirm(),
				}))
			)
				throw new Error(m.studio_move_cancelled());
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
			<Field name="lessonType" label={m.studio_lesson_type()}>
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
					<NativeSelectOption value="video">
						{m.studio_video()}
					</NativeSelectOption>
					<NativeSelectOption value="reading">
						{m.studio_reading()}
					</NativeSelectOption>
					<NativeSelectOption value="interactive">
						{m.studio_interactive()}
					</NativeSelectOption>
					<NativeSelectOption value="quiz">
						{m.studio_quiz()}
					</NativeSelectOption>
				</NativeSelect>
			</Field>
			{l.lessonType === "interactive" && (
				<Field name="activity" label={m.studio_interactive_activity()}>
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
								{m.studio_fix_json()}
							</NativeSelectOption>
						)}
						<NativeSelectOption value="ipv4">
							{m.studio_ipv4()}
						</NativeSelectOption>
						<NativeSelectOption value="private">
							{m.studio_private_ip()}
						</NativeSelectOption>
						<NativeSelectOption value="subnet">
							{m.studio_subnet()}
						</NativeSelectOption>
						<NativeSelectOption value="dns-resolution">
							{m.studio_dns_lookup()}
						</NativeSelectOption>
						<NativeSelectOption value="dns-records">
							{m.studio_dns_records()}
						</NativeSelectOption>
						<NativeSelectOption value="dns-cache">
							{m.studio_dns_cache()}
						</NativeSelectOption>
					</NativeSelect>
				</Field>
			)}
			{l.lessonType === "quiz" && (
				<Field name="activity" label={m.studio_quiz_activity()}>
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
							{m.studio_legacy_quiz()}
						</NativeSelectOption>
						<NativeSelectOption value="practice-quiz">
							{m.studio_practice_quiz()}
						</NativeSelectOption>
					</NativeSelect>
				</Field>
			)}
			{l.activityConfig != null && (
				<>
					<Field name="activityConfig" label={m.studio_activity_config()}>
						<Textarea
							className="min-h-64 font-mono text-sm"
							rows={14}
							maxLength={64000}
							value={l.activityConfig}
							onChange={(e) => set("activityConfig", e.target.value)}
						/>
					</Field>
					<p className="text-muted-foreground">{m.studio_activity_help()}</p>
				</>
			)}
			<Field name="title" label={m.studio_lesson_title()}>
				<Input
					required
					maxLength={200}
					value={l.title}
					onChange={(e) => set("title", e.target.value)}
				/>
			</Field>
			<Field name="description" label={m.studio_description()}>
				<Textarea
					maxLength={20000}
					value={l.description}
					onChange={(e) => set("description", e.target.value)}
				/>
			</Field>
			{l.lessonType === "video" && (
				<Field name="videoUrl" label={m.studio_youtube_url()}>
					<Input
						type="url"
						value={l.videoUrl ?? ""}
						onChange={(e) => set("videoUrl", e.target.value || null)}
					/>
				</Field>
			)}
			<Field
				name="content"
				label={
					l.lessonType === "reading"
						? m.studio_reading_content()
						: m.studio_lesson_notes()
				}
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
				{m.studio_code_help()}
			</p>
			<Field name="resourceLinks" label={m.studio_resource_links()}>
				<Textarea
					rows={3}
					maxLength={4000}
					value={l.resourceLinks}
					onChange={(e) => set("resourceLinks", e.target.value)}
				/>
			</Field>
			<Field name="durationSeconds" label={m.studio_duration()}>
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
				label={m.studio_free_preview()}
				checked={l.preview}
				onChange={(v) => set("preview", v)}
			/>
			<Toggle
				label={m.studio_published()}
				checked={l.published}
				onChange={(v) => set("published", v)}
			/>
			<LessonPreview lesson={l} />
			{initial.id && (
				<details className="rounded-lg border border-border bg-muted p-4 text-foreground">
					<summary className="cursor-pointer min-h-8">
						{m.studio_move_lesson()}
					</summary>
					<div className="grid gap-4 mt-4">
						<ParentPicker
							kind="courses"
							label={m.studio_destination_course()}
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
							label={m.studio_parent_section()}
							value={[l.sectionId]}
							onChange={(ids) => set("sectionId", ids[0])}
						/>
					</div>
				</details>
			)}
			<EditorActions editor={editor} />
			{!l.sectionId && <p role="alert">{m.studio_select_section()}</p>}
		</EditorForm>
	);
}
