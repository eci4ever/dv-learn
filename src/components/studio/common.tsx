import { useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate, useSearch } from "@tanstack/react-router";
import {
	cloneElement,
	createContext,
	type ReactElement,
	type ReactNode,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import * as m from "../../paraglide/messages.js";
import { getLocale } from "../../paraglide/runtime.js";
import {
	type Page,
	type StudioSearch,
	studioSearch,
} from "../../server/studio";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { NativeSelect, NativeSelectOption } from "../ui/native-select";

export const keys = {
	courses: ["studio", "courses"],
	sections: (id: string) => ["studio", "sections", id],
	lessons: (id: string) => ["studio", "lessons", id],
	detail: (kind: string, id: string) => ["studio", kind, "detail", id],
	products: ["studio", "products"],
	access: ["studio", "access"],
	orders: ["studio", "orders"],
	receipts: ["studio", "receipts"],
	audit: ["studio", "audit"],
	summary: ["studio", "summary"],
};
export function useStudioSearch() {
	const raw = useSearch({ strict: false });
	const search = studioSearch.parse(raw);
	const navigate = useNavigate();
	function update(next: Partial<StudioSearch>, resetPage = true) {
		void navigate({
			to: ".",
			search: (previous) => ({
				...studioSearch.parse(previous),
				...(resetPage ? { page: 1 } : {}),
				...next,
			}),
			replace: true,
		});
	}
	return { search, update };
}
export function useCreatedNavigation(
	kind: "course" | "lesson" | "product" | "section",
	existing: string | undefined,
	editor: { savedId?: string; dirty: boolean; busy: boolean },
	courseId = "",
) {
	const navigate = useNavigate();
	const { savedId, dirty, busy } = editor;
	useEffect(() => {
		if (existing || !savedId || dirty || busy) return;
		const search = studioSearch.parse({});
		if (kind === "course")
			void navigate({
				to: "/admin/courses/$courseId",
				params: { courseId: savedId },
				search,
				replace: true,
			});
		else if (kind === "product")
			void navigate({
				to: "/admin/products/$productId",
				params: { productId: savedId },
				search,
				replace: true,
			});
		else if (kind === "section")
			void navigate({
				to: "/admin/courses/$courseId",
				params: { courseId },
				search: { ...search, tab: "content", section: savedId },
				replace: true,
			});
		else
			void navigate({
				to: "/admin/courses/$courseId/lessons/$lessonId",
				params: { courseId, lessonId: savedId },
				search,
				replace: true,
			});
	}, [existing, savedId, dirty, busy, kind, courseId, navigate]);
}
export function useDebounced(value: string) {
	const [result, setResult] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setResult(value), 300);
		return () => clearTimeout(timer);
	}, [value]);
	return result;
}
export function SearchField({
	value,
	onChange,
	label = m.studio_search(),
}: {
	value: string;
	onChange: (value: string) => void;
	label?: string;
}) {
	const [draft, setDraft] = useState(value);
	useEffect(() => {
		setDraft(value);
	}, [value]);
	useEffect(() => {
		if (draft === value) return;
		const timer = setTimeout(() => onChange(draft), 300);
		return () => clearTimeout(timer);
	}, [draft, value, onChange]);
	return (
		<Label className="grid gap-2 flex-1">
			{label}
			<Input
				type="search"
				value={draft}
				maxLength={200}
				onChange={(e) => setDraft(e.target.value)}
			/>
		</Label>
	);
}
export function Filter({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: [string, string][];
}) {
	const id = useId();
	return (
		<div className="grid gap-2">
			<Label htmlFor={id}>{label}</Label>
			<NativeSelect
				id={id}
				className="w-full"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			>
				{options.map(([v, text]) => (
					<NativeSelectOption key={v} value={v}>
						{text}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</div>
	);
}
export function Pagination({
	data,
	onPage,
}: {
	data?: Pick<Page<unknown>, "total" | "page" | "pageSize">;
	onPage: (page: number) => void;
}) {
	if (!data) return null;
	return (
		<nav
			aria-label={m.studio_pagination()}
			className="flex flex-wrap items-center gap-3"
		>
			<p role="status" className="text-sm text-muted-foreground">
				{m.studio_page_summary({
					total: data.total,
					page: data.page,
					pages: Math.max(1, Math.ceil(data.total / data.pageSize)),
				})}
			</p>
			<Button
				variant="outline"
				disabled={data.page <= 1}
				onClick={() => onPage(data.page - 1)}
			>
				{m.studio_previous()}
			</Button>
			<Button
				variant="outline"
				disabled={data.page * data.pageSize >= data.total}
				onClick={() => onPage(data.page + 1)}
			>
				{m.studio_next()}
			</Button>
		</nav>
	);
}
export function QueryState({
	query,
}: {
	query: { isPending: boolean; error: Error | null; refetch: () => unknown };
}) {
	if (query.isPending) return <p role="status">{m.studio_loading()}</p>;
	if (query.error)
		return (
			<div role="alert" className="grid gap-3 rounded-lg border p-4">
				<p>
					{studioDisplayMessage(query.error.message, m.studio_load_error())}
				</p>
				<Button variant="outline" onClick={() => query.refetch()}>
					{m.studio_retry()}
				</Button>
			</div>
		);
	return null;
}
export function EmptyList({
	children = m.studio_empty(),
}: {
	children?: ReactNode;
}) {
	return (
		<p className="rounded-lg border border-dashed p-6 text-muted-foreground">
			{children}
		</p>
	);
}
export function useEditor<T>(
	initial: T,
	save: (value: T) => Promise<unknown>,
	invalidate: readonly unknown[][] | ((value: T) => readonly unknown[][]),
	validation?: {
		safeParse: (value: unknown) => {
			success: boolean;
			error?: { issues: readonly { path: PropertyKey[]; message: string }[] };
		};
	},
) {
	const [value, setValue] = useState(initial);
	const [baseline, setBaseline] = useState(initial);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState(new Map<string, string>());
	const [saved, setSaved] = useState(false);
	const persisted =
		initial !== null &&
		typeof initial === "object" &&
		"id" in initial &&
		Boolean(initial.id);
	const [savedId, setSavedId] = useState<string>();
	const dirty = JSON.stringify(value) !== JSON.stringify(baseline);
	const client = useQueryClient();
	const blocker = useBlocker({
		shouldBlockFn: ({ current, next }) =>
			dirty &&
			(current.pathname !== next.pathname ||
				studioSearch.parse(current.search).tab !==
					studioSearch.parse(next.search).tab ||
				studioSearch.parse(current.search).page !==
					studioSearch.parse(next.search).page),
		withResolver: true,
		enableBeforeUnload: dirty,
	});
	async function submit() {
		if (busy) return;
		const checked = validation?.safeParse(value);
		if (checked && !checked.success) {
			setFieldErrors(
				new Map(
					checked.error?.issues.map((issue) => [
						String(issue.path[0]),
						studioValidationMessage(issue.message, String(issue.path[0])),
					]),
				),
			);
			setError(m.studio_check_fields());
			return;
		}
		setFieldErrors(new Map());
		setBusy(true);
		setError("");
		try {
			const result = await save(value);
			if (
				result &&
				typeof result === "object" &&
				"id" in result &&
				typeof result.id === "string"
			)
				setSavedId(result.id);
			setBaseline(value);
			setSaved(true);
			await Promise.all(
				(typeof invalidate === "function" ? invalidate(value) : invalidate).map(
					(queryKey) => client.invalidateQueries({ queryKey }),
				),
			);
		} catch (e) {
			setError(
				e instanceof Error && e.message === m.studio_move_cancelled()
					? m.studio_move_cancelled()
					: m.studio_save_context({
							issue: studioDisplayMessage(
								e instanceof Error ? e.message : "",
								m.studio_save_failed(),
							),
						}),
			);
		} finally {
			setBusy(false);
		}
	}
	return {
		value,
		setValue,
		dirty,
		savedId,
		busy,
		error,
		fieldErrors,
		submit,
		cancel: () => {
			setValue(baseline);
			setError("");
			setFieldErrors(new Map());
		},
		status: busy
			? m.studio_saving()
			: dirty || (!persisted && !saved)
				? m.studio_unsaved()
				: m.studio_saved(),
		blockerDialog: (
			<Dialog
				open={blocker.status === "blocked"}
				onOpenChange={(open) => {
					if (!open) blocker.reset?.();
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{m.studio_discard_title()}</DialogTitle>
						<DialogDescription>{m.studio_discard_help()}</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => blocker.reset?.()}>
							{m.studio_stay()}
						</Button>
						<Button variant="destructive" onClick={() => blocker.proceed?.()}>
							{m.studio_discard()}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		),
	};
}
export function EditorActions({
	editor,
}: {
	editor: {
		busy: boolean;
		error: string;
		status: string;
		cancel: () => void;
		fieldErrors?: ReadonlyMap<string, string>;
	};
}) {
	const errorRef = useRef<HTMLParagraphElement>(null);
	useEffect(() => {
		if (editor.error && !editor.fieldErrors?.size) errorRef.current?.focus();
	}, [editor.error, editor.fieldErrors]);
	return (
		<div className="grid gap-3 border-t pt-4">
			{editor.error && (
				<p
					ref={errorRef}
					tabIndex={-1}
					role="alert"
					className="text-destructive break-words"
				>
					{editor.error}
				</p>
			)}
			<div className="flex flex-wrap items-center gap-3">
				<Button type="submit" disabled={editor.busy}>
					{m.studio_save()}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={editor.busy}
					onClick={editor.cancel}
				>
					{m.studio_discard()}
				</Button>
				<span role="status" className="text-sm text-muted-foreground">
					{editor.status}
				</span>
			</div>
			<p className="text-sm text-muted-foreground">{m.studio_save_help()}</p>
		</div>
	);
}
const EditorFields = createContext<{
	errors: ReadonlyMap<string, string>;
	first?: string;
}>({ errors: new Map() });
export function useEditorFieldError(name?: string) {
	const context = useContext(EditorFields);
	return {
		error: name ? context.errors.get(name) : undefined,
		first: context.first === name,
	};
}
export function EditorForm({
	editor,
	children,
}: {
	editor: {
		submit: () => Promise<void>;
		busy: boolean;
		fieldErrors: ReadonlyMap<string, string>;
		blockerDialog: ReactNode;
	};
	children: ReactNode;
}) {
	return (
		<form
			noValidate
			className="studio-form"
			onSubmit={(e) => {
				e.preventDefault();
				void editor.submit();
			}}
		>
			{editor.blockerDialog}
			<EditorFields.Provider
				value={{
					errors: editor.fieldErrors,
					first: editor.fieldErrors.keys().next().value,
				}}
			>
				<fieldset disabled={editor.busy} className="contents">
					{children}
				</fieldset>
			</EditorFields.Provider>
		</form>
	);
}
export function Field({
	label,
	name,
	children,
}: {
	label: string;
	name: string;
	children: ReactElement<{
		id?: string;
		name?: string;
		"aria-invalid"?: boolean;
		"aria-describedby"?: string;
	}>;
}) {
	const id = useId();
	const { error, first } = useEditorFieldError(name);
	useEffect(() => {
		if (error && first) document.getElementById(id)?.focus();
	}, [error, first, id]);
	return (
		<div className="grid items-start gap-2">
			<Label htmlFor={id}>{label}</Label>
			{cloneElement(children, {
				id,
				name,
				"aria-invalid": Boolean(error),
				"aria-describedby": error ? `${id}-error` : undefined,
			})}
			{error && (
				<p id={`${id}-error`} role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}
export function Toggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="flex items-center gap-3 min-h-11">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="size-5 accent-primary"
			/>
			{label}
		</label>
	);
}
export const money = (cents: number) =>
	new Intl.NumberFormat(getLocale() === "ms" ? "ms-MY" : "en-MY", {
		style: "currency",
		currency: "MYR",
	}).format(cents / 100);

// Translate only known display messages; authored titles and API values stay intact.
export function studioDisplayMessage(
	message: string,
	fallback: string = m.studio_readiness_fallback(),
): string {
	const messages: [string, () => string][] = [
		["Add a lesson title.", m.studio_add_lesson_title],
		["Add a valid YouTube video.", m.studio_valid_video],
		["Add reading content.", m.studio_add_reading],
		["Choose an interactive activity.", m.studio_choose_interactive],
		["Choose a quiz activity.", m.studio_choose_quiz],
		[
			"Add valid version 1 activity JSON with complete exercise data.",
			m.studio_valid_activity_json,
		],
		[
			"Choose either a legacy activity or configured practice, not both.",
			m.studio_activity_one,
		],
		[
			"The activity configuration does not match the lesson type.",
			m.studio_activity_mismatch,
		],
		["Add a course title.", m.studio_add_course_title],
		["Add a course description.", m.studio_add_course_description],
		["Unarchive this course before publishing.", m.studio_unarchive_course],
		["Publish at least one lesson.", m.studio_publish_lesson],
		[
			"Free course: every published lesson is a public preview. Practice progress still requires an account with course access.",
			m.studio_access_free,
		],
		[
			"Paid course: an active product provides access. Free-preview lessons remain public.",
			m.studio_access_paid,
		],
		[
			"Manual access only: grant access in Studio, or link an active product to sell this course.",
			m.studio_access_manual,
		],
		["Use an HTTP or HTTPS URL", m.studio_http_url],
		["Use HTTPS links, one per line.", m.studio_https_links],
		["Enter a valid YouTube URL.", m.studio_valid_youtube],
		["Course not found.", m.studio_not_found],
		["Section not found.", m.studio_not_found],
		["Lesson not found.", m.studio_not_found],
	];
	for (const [source, translate] of messages) {
		if (message === source) return translate();
		if (message.endsWith(`: ${source}`))
			return m.studio_issue_context({
				title: message.slice(0, -(source.length + 2)),
				issue: translate(),
			});
	}
	return fallback;
}

export function studioLessonType(type: string): string {
	switch (type) {
		case "video":
			return m.studio_video();
		case "reading":
			return m.studio_reading();
		case "interactive":
			return m.studio_interactive();
		case "quiz":
			return m.studio_quiz();
		default:
			return m.studio_lesson_type();
	}
}

function studioValidationMessage(message: string, field: string): string {
	const known = studioDisplayMessage(message, "");
	if (known) return known;
	const limit = message.match(
		/^(Too small: expected string to have >=|Too big: expected string to have <=)(\d+) characters$/,
	);
	if (limit)
		return limit[1].startsWith("Too small")
			? m.studio_min_length({ count: Number(limit[2]) })
			: m.studio_max_length({ count: Number(limit[2]) });
	const bound = message.match(
		/^(Too small: expected number to be >=|Too big: expected number to be <=)(\d+)$/,
	);
	if (bound)
		return bound[1].startsWith("Too small")
			? m.studio_number_min({ count: Number(bound[2]) })
			: m.studio_number_max({ count: Number(bound[2]) });
	if (message === "Invalid input: expected int, received number")
		return m.studio_whole_number();
	if (message === "Invalid URL") return m.studio_valid_url();
	if (field === "slug") return m.studio_valid_slug();
	return m.studio_invalid_field();
}
