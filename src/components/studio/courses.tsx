import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useParams } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { CourseInput } from "../../server/contracts";
import { saveCourse } from "../../server/functions";
import * as api from "../../server/studio";
import * as validation from "../../server/validation";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
	EditorActions,
	EditorForm,
	EmptyList,
	Field,
	Filter,
	keys,
	Pagination,
	QueryState,
	SearchField,
	Toggle,
	useCreatedNavigation,
	useEditor,
	useStudioSearch,
} from "./common";

export function CoursesPage() {
	const { search, update } = useStudioSearch();
	const query = useQuery({
		queryKey: [...keys.courses, search],
		queryFn: () => api.listAdminCourses({ data: search }),
	});
	const categories = useQuery({
		queryKey: ["studio", "categories"],
		queryFn: () => api.getAdminCategories(),
	});
	return (
		<section className="grid gap-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2>Kursus</h2>
				<Link
					search={api.studioSearch.parse({})}
					to="/admin/courses/$courseId"
					params={{ courseId: "new" }}
					className="studio-link"
				>
					Tambah kursus
				</Link>
			</div>
			<div className="flex flex-wrap gap-3 items-end">
				<SearchField
					label="Cari tajuk atau slug"
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label="Kategori"
					value={search.category}
					onChange={(category) => update({ category })}
					options={[
						["", "Semua kategori"],
						...(categories.data ?? []).map(
							(c) => [c.category, c.category] as [string, string],
						),
					]}
				/>
				<Filter
					label="Status"
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", "Semua"],
						["draft", "Draft"],
						["published", "Diterbitkan"],
						["archived", "Arkib"],
					]}
				/>
			</div>
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList />}
			<ul className="grid gap-3">
				{query.data?.items.map((c) => (
					<li key={c.id} className="studio-row">
						<div className="min-w-0">
							<Link
								search={api.studioSearch.parse({})}
								to="/admin/courses/$courseId"
								params={{ courseId: c.id }}
								className="font-medium break-words underline underline-offset-4"
							>
								{c.title}
							</Link>
							<p className="text-sm text-muted-foreground break-words">
								{c.slug} · {c.category}
							</p>
						</div>
						<Badge variant="outline">
							{c.archived ? "Arkib" : c.published ? "Diterbitkan" : "Draft"}
						</Badge>
						<MoveButtons kind="courses" id={c.id} invalidate={[keys.courses]} />
					</li>
				))}
			</ul>
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</section>
	);
}
export function MoveButtons({
	kind,
	id,
	parentId,
	invalidate,
}: {
	kind: "courses" | "sections" | "lessons";
	id: string;
	parentId?: string;
	invalidate: readonly unknown[][];
}) {
	const client = useQueryClient();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function move(direction: "up" | "down") {
		setBusy(true);
		setError("");
		try {
			await api.moveAdminContent({ data: { kind, id, parentId, direction } });
			await Promise.all(
				invalidate.map((queryKey) => client.invalidateQueries({ queryKey })),
			);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Turutan gagal dikemas kini.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<div className="flex flex-wrap gap-2">
			<Button
				size="sm"
				variant="outline"
				disabled={busy}
				aria-label={`Naik ${id}`}
				onClick={() => move("up")}
			>
				↑ Naik
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={busy}
				aria-label={`Turun ${id}`}
				onClick={() => move("down")}
			>
				↓ Turun
			</Button>
			{error && <p role="alert">{error}</p>}
		</div>
	);
}
const emptyCourse: CourseInput = {
	title: "",
	slug: "",
	description: "",
	imageUrl: null,
	instructor: "",
	level: "Pemula",
	published: false,
	archived: false,
	sortOrder: 0,
	category: "Umum",
};
export function CoursePage() {
	const { courseId = "new" } = useParams({ strict: false });
	const { search, update } = useStudioSearch();
	const lessonRoute = useLocation({
		select: (l) =>
			l.pathname.includes("/lessons/") || l.pathname.includes("/sections/"),
	});
	const query = useQuery({
		queryKey: keys.detail("course", courseId),
		queryFn: () => api.getAdminCourse({ data: { id: courseId } }),
		enabled: courseId !== "new" && !lessonRoute,
	});
	if (lessonRoute) return <Outlet />;
	return (
		<section className="grid gap-5">
			<nav aria-label="Breadcrumb">
				<Link search={api.studioSearch.parse({})} to="/admin/courses">
					Kursus
				</Link>{" "}
				/{" "}
				{courseId === "new"
					? "Kursus baharu"
					: (query.data?.title ?? "Memuatkan…")}
			</nav>
			<h2 className="break-words">{query.data?.title ?? "Kursus baharu"}</h2>
			{courseId !== "new" && (
				<fieldset className="flex gap-2" aria-label="Ruang kerja kursus">
					<Button
						variant={search.tab === "info" ? "secondary" : "outline"}
						onClick={() => update({ tab: "info" })}
					>
						Maklumat
					</Button>
					<Button
						variant={search.tab === "content" ? "secondary" : "outline"}
						onClick={() => update({ tab: "content" })}
					>
						Kandungan
					</Button>
				</fieldset>
			)}
			{courseId !== "new" && <QueryState query={query} />}
			{(courseId === "new" || query.data) &&
				(search.tab === "content" && courseId !== "new" ? (
					<CourseContent courseId={courseId} />
				) : (
					<CourseForm key={courseId} initial={query.data ?? emptyCourse} />
				))}
		</section>
	);
}
function CourseForm({ initial }: { initial: CourseInput }) {
	const record = useRef(initial.id);
	const editor = useEditor(
		initial,
		async (value) => {
			const result = await saveCourse({
				data: { ...value, id: record.current },
			});
			record.current = result.id;
			return result;
		},
		[
			keys.courses,
			keys.detail("course", initial.id ?? "new"),
			["studio", "categories"],
			["studio", "picker", "courses"],
			["studio", "choice-labels", "courses"],
		],
		validation.courseInput,
	);
	const { value: c, setValue } = editor;
	useCreatedNavigation("course", initial.id, editor);
	const set = <K extends keyof CourseInput>(key: K, value: CourseInput[K]) =>
		setValue({ ...c, [key]: value });
	return (
		<EditorForm editor={editor}>
			<Field name="title" label="Tajuk">
				<Input
					required
					maxLength={200}
					value={c.title}
					onChange={(e) => set("title", e.target.value)}
				/>
			</Field>
			<Field name="slug" label="Slug">
				<Input
					required
					pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
					maxLength={100}
					value={c.slug}
					onChange={(e) => set("slug", e.target.value)}
				/>
			</Field>
			<Field name="description" label="Penerangan">
				<Textarea
					maxLength={20000}
					value={c.description}
					onChange={(e) => set("description", e.target.value)}
				/>
			</Field>
			<Field name="imageUrl" label="URL imej">
				<Input
					type="url"
					value={c.imageUrl ?? ""}
					onChange={(e) => set("imageUrl", e.target.value || null)}
				/>
			</Field>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field name="instructor" label="Pengajar">
					<Input
						maxLength={200}
						value={c.instructor}
						onChange={(e) => set("instructor", e.target.value)}
					/>
				</Field>
				<Field name="level" label="Tahap">
					<Input
						maxLength={100}
						value={c.level}
						onChange={(e) => set("level", e.target.value)}
					/>
				</Field>
				<Field name="category" label="Kategori">
					<Input
						required
						maxLength={100}
						value={c.category}
						onChange={(e) => set("category", e.target.value)}
					/>
				</Field>
			</div>
			<Toggle
				label="Diterbitkan"
				checked={c.published}
				onChange={(v) => set("published", v)}
			/>
			<Toggle
				label="Arkib"
				checked={c.archived}
				onChange={(v) => set("archived", v)}
			/>
			<EditorActions editor={editor} />
		</EditorForm>
	);
}
export function CourseContent({ courseId }: { courseId: string }) {
	const { search, update } = useStudioSearch();
	const query = useQuery({
		queryKey: [...keys.sections(courseId), search.page],
		queryFn: () =>
			api.listAdminSections({
				data: { parentId: courseId, page: search.page },
			}),
	});
	return (
		<div className="grid gap-4">
			<div className="flex flex-wrap justify-between gap-3">
				<h3>Seksyen dan pelajaran</h3>
				<Link
					to="/admin/courses/$courseId/sections/$sectionId"
					params={{ courseId, sectionId: "new" }}
					className="studio-link"
				>
					Tambah seksyen
				</Link>
			</div>
			<QueryState query={query} />
			{query.data?.items.length === 0 && (
				<EmptyList>
					Belum ada seksyen. Tambah seksyen untuk mula membina kandungan.
				</EmptyList>
			)}
			{query.data?.items.map((s) => (
				<SectionPanel key={s.id} section={s} />
			))}
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</div>
	);
}
function SectionPanel({ section: s }: { section: api.SectionSummary }) {
	const { search, update } = useStudioSearch();
	const [open, setOpen] = useState(search.section === s.id);
	return (
		<div className="rounded-lg border p-4 grid gap-4">
			<div className="flex flex-wrap justify-between gap-3">
				<Button
					variant="ghost"
					aria-expanded={open}
					aria-controls={`section-${s.id}`}
					className="h-auto text-left whitespace-normal"
					onClick={() => {
						setOpen(!open);
						if (!open && search.section !== s.id)
							update({ section: s.id, lessonPage: 1, lessonQ: "" }, false);
					}}
				>
					{open ? "▾" : "▸"} {s.title} · {s.lessonCount} pelajaran
				</Button>
				<div className="flex flex-wrap gap-2">
					<Link
						to="/admin/courses/$courseId/sections/$sectionId"
						params={{ courseId: s.courseId, sectionId: s.id }}
						className="studio-link"
					>
						Edit seksyen
					</Link>
					<MoveButtons
						kind="sections"
						id={s.id}
						parentId={s.courseId}
						invalidate={[keys.sections(s.courseId)]}
					/>
				</div>
			</div>
			{open && (
				<div id={`section-${s.id}`}>
					<LessonList section={s} />
				</div>
			)}
		</div>
	);
}
export function LessonList({
	section,
	selected,
}: {
	section: { id: string; courseId: string; title: string };
	selected?: string;
}) {
	const { search, update } = useStudioSearch();
	const page = search.section === section.id ? search.lessonPage : 1;
	const q = search.section === section.id ? search.lessonQ : "";
	const query = useQuery({
		queryKey: [...keys.lessons(section.id), page, q],
		queryFn: () =>
			api.listAdminLessons({ data: { parentId: section.id, page, q } }),
	});
	return (
		<div className="grid gap-3 min-w-0">
			<SearchField
				label="Cari pelajaran dalam seksyen"
				value={q}
				onChange={(v) => {
					update({ section: section.id, lessonQ: v, lessonPage: 1 }, false);
				}}
			/>
			<Link
				search={api.studioSearch.parse({})}
				to="/admin/courses/$courseId/lessons/$lessonId"
				params={{ courseId: section.courseId, lessonId: `new-${section.id}` }}
				className="studio-link"
			>
				Tambah pelajaran
			</Link>
			<QueryState query={query} />
			{query.data?.items.length === 0 && (
				<EmptyList>Tiada pelajaran dalam seksyen ini.</EmptyList>
			)}
			<ul className="grid gap-2">
				{query.data?.items.map((l) => (
					<li
						key={l.id}
						className={`grid gap-2 rounded-lg border p-3 ${selected === l.id ? "border-primary bg-muted" : ""}`}
					>
						<Link
							search={api.studioSearch.parse({})}
							to="/admin/courses/$courseId/lessons/$lessonId"
							params={{ courseId: section.courseId, lessonId: l.id }}
							aria-current={selected === l.id ? "page" : undefined}
							className="underline break-words"
						>
							{l.title}
						</Link>
						<p className="text-sm text-muted-foreground">
							{l.published ? "Diterbitkan" : "Draft"}
							{l.preview ? " · Preview percuma" : ""}
						</p>
						<MoveButtons
							kind="lessons"
							id={l.id}
							parentId={section.id}
							invalidate={[keys.lessons(section.id)]}
						/>
					</li>
				))}
			</ul>
			<Pagination
				data={query.data}
				onPage={(page) =>
					update({ section: section.id, lessonQ: q, lessonPage: page }, false)
				}
			/>
		</div>
	);
}
