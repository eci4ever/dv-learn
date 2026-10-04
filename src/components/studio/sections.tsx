import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useRef } from "react";
import type { SectionInput } from "../../server/contracts";
import { saveSection } from "../../server/functions";
import * as api from "../../server/studio";
import * as validation from "../../server/validation";
import { useActionDialog } from "../action-dialog";
import { Input } from "../ui/input";
import {
	EditorActions,
	EditorForm,
	Field,
	keys,
	QueryState,
	useCreatedNavigation,
	useEditor,
} from "./common";
import { ParentPicker } from "./picker";

export function SectionPage() {
	const { courseId = "", sectionId = "new" } = useParams({ strict: false });
	const query = useQuery({
		queryKey: [...keys.detail("section", sectionId), courseId],
		queryFn: () => api.getAdminSection({ data: { id: sectionId } }),
		enabled: sectionId !== "new",
	});
	if (query.data && query.data.courseId !== courseId)
		return (
			<p role="alert">
				This section belongs to another course. Open it from that course.
			</p>
		);
	return (
		<section className="grid gap-5">
			<nav aria-label="Breadcrumb">
				<Link to="/admin/courses">Courses</Link> /{" "}
				<Link
					to="/admin/courses/$courseId"
					params={{ courseId }}
					search={{ tab: "content" }}
				>
					Course content
				</Link>{" "}
				/ {query.data?.title ?? "New section"}
			</nav>
			<h2>{query.data?.title ?? "New section"}</h2>
			{sectionId !== "new" && <QueryState query={query} />}
			{(sectionId === "new" || query.data) && (
				<SectionForm
					key={`${courseId}-${sectionId}`}
					initial={query.data ?? { courseId, title: "", sortOrder: 0 }}
				/>
			)}
		</section>
	);
}
function SectionForm({ initial }: { initial: SectionInput }) {
	const record = useRef(initial.id);
	const { confirmAction, actionDialog } = useActionDialog();
	const editor = useEditor(
		initial,
		async (value) => {
			if (
				initial.id &&
				value.courseId !== initial.courseId &&
				!(await confirmAction({
					description:
						"Move this section and all its lessons to another course? Access to the original course does not grant access to the destination course.",
				}))
			)
				throw new Error("Move cancelled.");
			const result = await saveSection({
				data: { ...value, id: record.current },
			});
			record.current = result.id;
			return result;
		},
		(value) => [
			keys.sections(initial.courseId),
			keys.sections(value.courseId),
			["studio", "picker", "sections", initial.courseId],
			["studio", "picker", "sections", value.courseId],
			["studio", "choice-labels", "sections"],
			...(value.courseId === initial.courseId
				? [keys.detail("section", initial.id ?? "new")]
				: []),
		],
		validation.sectionInput,
	);
	const { value, setValue } = editor;
	useCreatedNavigation(
		"section",
		initial.courseId !== value.courseId ? undefined : initial.id,
		editor,
		value.courseId,
	);
	return (
		<EditorForm editor={editor}>
			{actionDialog}
			<Field name="title" label="Section title">
				<Input
					required
					maxLength={200}
					value={value.title}
					onChange={(e) => setValue({ ...value, title: e.target.value })}
				/>
			</Field>
			{initial.id && (
				<ParentPicker
					name="courseId"
					kind="courses"
					label="Parent course"
					value={[value.courseId]}
					onChange={(ids) => setValue({ ...value, courseId: ids[0] })}
				/>
			)}
			<EditorActions editor={editor} />
		</EditorForm>
	);
}
