import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useRef } from "react";
import type { ProductInput } from "../../server/contracts";
import { saveProduct } from "../../server/functions";
import * as api from "../../server/studio";
import * as validation from "../../server/validation";
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
	money,
	Pagination,
	QueryState,
	SearchField,
	Toggle,
	useCreatedNavigation,
	useEditor,
	useStudioSearch,
} from "./common";
import { ParentPicker, useChoiceLabels } from "./picker";

export function ProductsPage() {
	const { search, update } = useStudioSearch();
	const query = useQuery({
		queryKey: [...keys.products, search],
		queryFn: () => api.listAdminProducts({ data: search }),
	});
	return (
		<section className="grid gap-5">
			<div className="flex flex-wrap justify-between gap-3">
				<h2>Produk</h2>
				<Link
					search={api.studioSearch.parse({})}
					to="/admin/products/$productId"
					params={{ productId: "new" }}
					className="studio-link"
				>
					Tambah produk
				</Link>
			</div>
			<div className="flex flex-wrap gap-3 items-end">
				<SearchField
					label="Cari produk"
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label="Status"
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", "Semua"],
						["active", "Aktif"],
						["draft", "Tidak aktif"],
					]}
				/>
			</div>
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList />}
			<ul className="grid gap-3">
				{query.data?.items.map((p) => (
					<li key={p.id} className="studio-row">
						<Link
							search={api.studioSearch.parse({})}
							to="/admin/products/$productId"
							params={{ productId: p.id }}
							className="underline break-words"
						>
							{p.title}
						</Link>
						<span>
							{money(p.priceCents)} · {p.active ? "Aktif" : "Tidak aktif"}
						</span>
					</li>
				))}
			</ul>
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</section>
	);
}
export function ProductPage() {
	const { productId = "new" } = useParams({ strict: false });
	const query = useQuery({
		queryKey: keys.detail("product", productId),
		queryFn: () => api.getAdminProduct({ data: { id: productId } }),
		enabled: productId !== "new",
	});
	return (
		<section className="grid gap-5">
			<nav aria-label="Breadcrumb">
				<Link search={api.studioSearch.parse({})} to="/admin/products">
					Produk
				</Link>{" "}
				/ {query.data?.title ?? "Produk baharu"}
			</nav>
			<h2>{query.data?.title ?? "Produk baharu"}</h2>
			{productId !== "new" && <QueryState query={query} />}
			{(productId === "new" || query.data) && (
				<ProductForm
					key={productId}
					initial={
						query.data ?? {
							title: "",
							description: "",
							priceCents: 100,
							currency: "MYR",
							active: false,
							courseIds: [],
						}
					}
				/>
			)}
		</section>
	);
}
function ProductForm({ initial }: { initial: ProductInput }) {
	const record = useRef(initial.id);
	const editor = useEditor(
		initial,
		async (value) => {
			const result = await saveProduct({
				data: { ...value, id: record.current },
			});
			record.current = result.id;
			return result;
		},
		[keys.products, keys.detail("product", initial.id ?? "new")],
		validation.productInput,
	);
	const { value: p, setValue } = editor;
	const labels = useChoiceLabels("courses", p.courseIds);
	useCreatedNavigation("product", initial.id, editor);
	return (
		<EditorForm editor={editor}>
			<Field name="title" label="Tajuk produk">
				<Input
					required
					maxLength={200}
					value={p.title}
					onChange={(e) => setValue({ ...p, title: e.target.value })}
				/>
			</Field>
			<Field name="description" label="Penerangan">
				<Textarea
					maxLength={20000}
					value={p.description}
					onChange={(e) => setValue({ ...p, description: e.target.value })}
				/>
			</Field>
			<Field name="priceCents" label="Harga (sen MYR)">
				<Input
					type="number"
					min={1}
					max={100000000}
					required
					value={p.priceCents}
					onChange={(e) =>
						setValue({ ...p, priceCents: e.target.valueAsNumber || 0 })
					}
				/>
			</Field>
			<Toggle
				label="Aktif"
				checked={p.active}
				onChange={(active) => setValue({ ...p, active })}
			/>
			<ParentPicker
				name="courseIds"
				kind="courses"
				label="Tambah kursus dalam produk"
				value={p.courseIds}
				onChange={(ids) => {
					const id = ids[0];
					if (!p.courseIds.includes(id) && p.courseIds.length < 50)
						setValue({ ...p, courseIds: [...p.courseIds, id] });
				}}
			/>
			<fieldset className="grid gap-2">
				<legend>Kursus dipilih ({p.courseIds.length}/50)</legend>
				{p.courseIds.map((id) => (
					<div key={id} className="flex gap-3 items-center">
						<Link
							search={api.studioSearch.parse({})}
							to="/admin/courses/$courseId"
							params={{ courseId: id }}
							className="break-all text-sm underline"
						>
							{labels.data?.find((c) => c.id === id)?.title ??
								"Memuatkan kursus…"}
						</Link>
						<Button
							type="button"
							variant="outline"
							onClick={() =>
								setValue({
									...p,
									courseIds: p.courseIds.filter((c) => c !== id),
								})
							}
						>
							Buang
						</Button>
					</div>
				))}
			</fieldset>
			{p.courseIds.length === 0 && (
				<p>Pilih sekurang-kurangnya satu kursus sebelum menyimpan.</p>
			)}
			<EditorActions editor={editor} />
		</EditorForm>
	);
}
