import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import {
	activityTextFields,
	saveTranslationInput,
	setActivityText,
	type TranslationKind,
	type TranslationPayload,
	type TranslationState,
} from "../../lib/studio-translation";
import * as m from "../../paraglide/messages.js";
import {
	getAdminTranslation,
	listAdminTranslations,
	saveAdminTranslation,
} from "../../server/studio-translations";
import { useActionDialog } from "../action-dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { NativeSelect, NativeSelectOption } from "../ui/native-select";
import { Textarea } from "../ui/textarea";
import {
	EditorActions,
	EditorForm,
	EmptyList,
	Field,
	Pagination,
	QueryState,
	SearchField,
	useDebounced,
	useEditor,
} from "./common";
import { LessonPreview } from "./lesson-preview";

type Translation = Awaited<ReturnType<typeof getAdminTranslation>>;
const statusLabel = (status: TranslationState) =>
	({
		missing: m.translation_missing,
		stale: m.translation_stale,
		incomplete: m.translation_incomplete,
		ready: m.translation_ready,
	})[status]();
const kindLabel = (kind: TranslationKind) =>
	({
		course: m.studio_course_content,
		section: m.studio_section,
		lesson: m.studio_lesson_editor,
	})[kind]();

export function CourseTranslations({ courseId }: { courseId: string }) {
	const contentLabel = useId();
	const [kind, setKind] = useState<TranslationKind>("course");
	const [selected, setSelected] = useState<string | null>(courseId);
	const [page, setPage] = useState(1);
	const [q, setQ] = useState("");
	const [editorState, setEditorState] = useState({ dirty: false, busy: false });
	const debounced = useDebounced(q);
	const { actionDialog, confirmAction } = useActionDialog();
	const list = useQuery({
		queryKey: [
			"studio",
			"translations",
			courseId,
			"list",
			kind,
			page,
			debounced,
		],
		queryFn: () =>
			listAdminTranslations({
				data: {
					courseId,
					kind: kind === "section" ? "section" : "lesson",
					page,
					q: debounced,
				},
			}),
		enabled: kind !== "course",
	});
	const detail = useQuery({
		queryKey: ["studio", "translations", courseId, "detail", kind, selected],
		queryFn: () =>
			getAdminTranslation({ data: { courseId, kind, id: selected ?? "" } }),
		enabled: Boolean(selected),
	});
	async function choose(nextKind: TranslationKind, id: string | null) {
		if (editorState.busy) return false;
		if (
			editorState.dirty &&
			!(await confirmAction({
				description: m.studio_discard_help(),
				confirmLabel: m.studio_discard(),
				destructive: true,
			}))
		)
			return false;
		setKind(nextKind);
		setSelected(id);
		setEditorState({ dirty: false, busy: false });
		return true;
	}
	return (
		<section className="grid min-w-0 gap-5" aria-label={m.translation_tab()}>
			{actionDialog}
			<Alert>
				<AlertDescription>
					<p>{m.translation_help()}</p>
					<p>{m.translation_metadata_help()}</p>
				</AlertDescription>
			</Alert>
			<div className="grid gap-2 max-w-sm">
				<Label htmlFor={contentLabel}>{m.translation_choose_content()}</Label>
				<NativeSelect
					id={contentLabel}
					value={kind}
					disabled={editorState.busy}
					onChange={(event) => {
						const next = event.target.value;
						if (next === "course" || next === "section" || next === "lesson")
							void choose(next, next === "course" ? courseId : null).then(
								(accepted) => {
									if (accepted) {
										setPage(1);
										setQ("");
									}
								},
							);
					}}
				>
					<NativeSelectOption value="course">
						{m.translation_course_details()}
					</NativeSelectOption>
					<NativeSelectOption value="section">
						{m.translation_sections()}
					</NativeSelectOption>
					<NativeSelectOption value="lesson">
						{m.translation_lessons()}
					</NativeSelectOption>
				</NativeSelect>
			</div>
			{kind !== "course" && (
				<div className="grid gap-3">
					<SearchField
						label={m.translation_search()}
						value={q}
						onChange={(value) => {
							setQ(value);
							setPage(1);
						}}
					/>
					<QueryState query={list} />
					{list.data?.items.length === 0 && <EmptyList />}
					<ul className="grid gap-2">
						{list.data?.items.map((item) => (
							<li key={item.id}>
								<Button
									type="button"
									variant={selected === item.id ? "secondary" : "outline"}
									className="h-auto min-h-11 w-full justify-between gap-3 whitespace-normal text-left"
									disabled={editorState.busy}
									onClick={() => void choose(kind, item.id)}
								>
									<span className="min-w-0 break-words">{item.title}</span>
									<Badge
										variant={item.status === "ready" ? "secondary" : "outline"}
										className="shrink-0"
									>
										{statusLabel(item.status)}
									</Badge>
								</Button>
							</li>
						))}
					</ul>
					<Pagination data={list.data} onPage={setPage} />
				</div>
			)}
			{selected ? (
				<>
					<QueryState query={detail} />
					{detail.data && (
						<TranslationEditor
							key={`${kind}:${selected}`}
							data={detail.data}
							onState={setEditorState}
						/>
					)}
				</>
			) : (
				<p>{m.translation_select_item()}</p>
			)}
		</section>
	);
}

function emptyPayload(data: Translation): TranslationPayload {
	if (data.kind === "course") return { title: "", description: "", level: "" };
	if (data.kind === "section") return { title: "" };
	return {
		title: "",
		description: "",
		content: "",
		activityConfig: data.source.activityConfig ?? null,
	};
}

function TranslationEditor({
	data,
	onState,
}: {
	data: Translation;
	onState: (state: { dirty: boolean; busy: boolean }) => void;
}) {
	const { actionDialog, confirmAction } = useActionDialog();
	const initial = useMemo(
		() => ({
			id: data.id,
			courseId: data.courseId,
			kind: data.kind,
			sourceVersion: data.sourceVersion,
			translationVersion: data.translationVersion,
			payload: data.payload ?? emptyPayload(data),
		}),
		[data],
	);
	const client = useQueryClient();
	const editor = useEditor(
		initial,
		async (value) => {
			try {
				return await saveAdminTranslation({
					data: saveTranslationInput.parse(value),
				});
			} catch (error) {
				if (error instanceof Error && error.message === "TRANSLATION_CONFLICT")
					await client.invalidateQueries({
						queryKey: ["studio", "translations", data.courseId],
					});
				throw error;
			}
		},
		[
			["studio", "translations", data.courseId],
			["catalog"],
			["course"],
			["lesson"],
			["dashboard"],
		],
		{
			safeParse(value) {
				const checked = saveTranslationInput.safeParse(value);
				if (!checked.success)
					return {
						success: false,
						error: {
							issues: checked.error.issues.map((issue) => ({
								...issue,
								path:
									issue.path[0] === "payload"
										? issue.path.slice(1)
										: issue.path,
							})),
						},
					};
				if (
					data.lessonType === "reading" &&
					checked.data.kind === "lesson" &&
					!checked.data.payload.content.trim()
				)
					return {
						success: false,
						error: {
							issues: [{ path: ["content"], message: "Add reading content." }],
						},
					};
				return { success: true };
			},
		},
	);
	const { dirty, busy, reset, value, setValue } = editor;
	useEffect(() => onState({ dirty, busy }), [dirty, busy, onState]);
	useEffect(() => {
		if (
			!dirty &&
			!busy &&
			(value.sourceVersion !== initial.sourceVersion ||
				value.translationVersion !== initial.translationVersion)
		)
			reset(initial);
	}, [
		dirty,
		busy,
		value.sourceVersion,
		value.translationVersion,
		initial,
		reset,
	]);
	const fields =
		data.kind === "course"
			? ["title", "description", "level"]
			: data.kind === "section"
				? ["title"]
				: ["title", "description", "content"];
	const labels: Record<string, string> = {
		title: m.studio_title(),
		description: m.studio_description(),
		level: m.studio_level(),
		content: m.studio_reading_content(),
	};
	const payloadFields: Record<string, unknown> = { ...value.payload };
	function setText(field: string, text: string) {
		setValue({ ...value, payload: { ...value.payload, [field]: text } });
	}
	const activity = value.payload.activityConfig ?? null;
	const activityFields = activityTextFields(data.source.activityConfig ?? null);
	const currentActivityFields = activityTextFields(activity);
	const sourceName =
		data.baseLocale === "ms" ? m.studio_malay() : m.studio_english();
	const targetName =
		data.locale === "ms" ? m.studio_malay() : m.studio_english();
	return (
		<EditorForm editor={editor}>
			{actionDialog}
			<Card className="min-w-0">
				<CardHeader className="gap-3">
					<CardTitle>
						{m.translation_editor_title({
							kind: kindLabel(data.kind),
							language: targetName,
						})}
					</CardTitle>
					<Badge className="w-fit" variant="outline">
						{statusLabel(data.status)}
					</Badge>
				</CardHeader>
				<CardContent className="grid min-w-0 gap-6">
					<p>{m.translation_live_warning()}</p>
					{data.status === "stale" && (
						<Alert>
							<AlertDescription>{m.translation_stale_help()}</AlertDescription>
						</Alert>
					)}
					{dirty &&
						(value.sourceVersion !== initial.sourceVersion ||
							value.translationVersion !== initial.translationVersion) && (
							<Alert variant="destructive">
								<AlertDescription>{m.translation_conflict()}</AlertDescription>
							</Alert>
						)}
					<Button
						type="button"
						variant="outline"
						className="w-fit h-auto min-h-11 whitespace-normal"
						disabled={busy}
						onClick={async () => {
							if (
								dirty &&
								!(await confirmAction({
									description: m.translation_replace_warning(),
									confirmLabel: m.translation_copy_source(),
									destructive: true,
								}))
							)
								return;
							const source = data.source;
							const payload: TranslationPayload =
								data.kind === "course"
									? {
											title: source.title ?? "",
											description: source.description ?? "",
											level: source.level ?? "",
										}
									: data.kind === "section"
										? { title: source.title ?? "" }
										: {
												title: source.title ?? "",
												description: source.description ?? "",
												content: source.content ?? "",
												activityConfig: source.activityConfig ?? null,
											};
							setValue({ ...value, payload });
						}}
					>
						{m.translation_copy_source()}
					</Button>
					<p className="text-sm text-muted-foreground">
						{m.translation_copy_hint()}
					</p>
					{fields.map((field) => (
						<div className="grid min-w-0 gap-3 md:grid-cols-2" key={field}>
							<Label className="grid min-w-0 gap-2">
								{m.translation_source_field({
									field: labels[field],
									language: sourceName,
								})}
								<Textarea
									aria-label={m.translation_source_field({
										field: labels[field],
										language: sourceName,
									})}
									value={data.source[field] ?? ""}
									readOnly
									lang={data.baseLocale}
									className="min-h-24"
								/>
							</Label>
							<Field
								name={field}
								label={m.translation_target_field({
									field: labels[field],
									language: targetName,
								})}
							>
								{field === "title" || field === "level" ? (
									<Input
										value={
											typeof payloadFields[field] === "string"
												? payloadFields[field]
												: ""
										}
										onChange={(event) => setText(field, event.target.value)}
										lang={data.locale}
										maxLength={field === "title" ? 200 : 100}
										disabled={busy}
									/>
								) : (
									<Textarea
										value={
											typeof payloadFields[field] === "string"
												? payloadFields[field]
												: ""
										}
										onChange={(event) => setText(field, event.target.value)}
										lang={data.locale}
										maxLength={field === "content" ? 100000 : 20000}
										className="min-h-32"
										disabled={busy}
									/>
								)}
							</Field>
						</div>
					))}
					{activityFields.length > 0 && (
						<section
							className="grid min-w-0 gap-4"
							aria-label={m.translation_activity_text()}
						>
							<h3>{m.translation_activity_text()}</h3>
							<p>{m.translation_activity_help()}</p>
							{activityFields.map((field) => {
								const path = field.path.join(" › ");
								const translated = currentActivityFields.find(
									(item) =>
										JSON.stringify(item.path) === JSON.stringify(field.path),
								);
								return (
									<div className="grid min-w-0 gap-3 md:grid-cols-2" key={path}>
										<Label className="grid min-w-0 gap-2">
											{m.translation_source_field({
												field: path,
												language: sourceName,
											})}
											<Textarea
												aria-label={m.translation_source_field({
													field: path,
													language: sourceName,
												})}
												value={field.text}
												readOnly
												lang={data.baseLocale}
											/>
										</Label>
										<Label className="grid min-w-0 gap-2">
											{m.translation_target_field({
												field: path,
												language: targetName,
											})}
											<Textarea
												aria-label={m.translation_target_field({
													field: path,
													language: targetName,
												})}
												value={translated?.text ?? field.text}
												lang={data.locale}
												maxLength={2000}
												disabled={busy}
												onChange={(event) => {
													if (activity && "activityConfig" in value.payload)
														setValue({
															...value,
															payload: {
																...value.payload,
																activityConfig: setActivityText(
																	activity,
																	field.path,
																	event.target.value,
																),
															},
														});
												}}
											/>
										</Label>
									</div>
								);
							})}
						</section>
					)}
					{data.sharedLesson && "content" in value.payload && (
						<LessonPreview
							language={data.locale}
							lesson={{
								...data.sharedLesson,
								id: data.id,
								title: value.payload.title,
								description: value.payload.description ?? "",
								content: value.payload.content ?? "",
								activityConfig: value.payload.activityConfig ?? null,
							}}
						/>
					)}
					<EditorActions editor={{ ...editor, cancel: () => reset(initial) }} />
				</CardContent>
			</Card>
		</EditorForm>
	);
}
