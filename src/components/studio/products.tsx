import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useRef } from "react";
import * as m from "../../paraglide/messages.js";
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
				<h2>{m.ops_products()}</h2>
				<Link
					search={api.studioSearch.parse({})}
					to="/admin/products/$productId"
					params={{ productId: "new" }}
					className="studio-link"
				>
					{m.ops_add_product()}
				</Link>
			</div>
			<div className="flex flex-wrap gap-3 items-end">
				<SearchField
					label={m.ops_search_products()}
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label={m.ops_status()}
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", m.ops_all()],
						["active", m.ops_active()],
						["draft", m.ops_inactive()],
					]}
				/>
			</div>
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList>{m.ops_empty()}</EmptyList>}
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
							{money(p.priceCents)} ·{" "}
							{p.active ? m.ops_active() : m.ops_inactive()}
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
			<nav aria-label={m.ops_breadcrumb()}>
				<Link search={api.studioSearch.parse({})} to="/admin/products">
					{m.ops_products()}
				</Link>{" "}
				/ {query.data?.title ?? m.ops_new_product()}
			</nav>
			<h2>{query.data?.title ?? m.ops_new_product()}</h2>
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
			<Field name="title" label={m.ops_product_title()}>
				<Input
					required
					maxLength={200}
					value={p.title}
					onChange={(e) => setValue({ ...p, title: e.target.value })}
				/>
			</Field>
			<Field name="description" label={m.ops_description()}>
				<Textarea
					maxLength={20000}
					value={p.description}
					onChange={(e) => setValue({ ...p, description: e.target.value })}
				/>
			</Field>
			<Field name="priceCents" label={m.ops_price()}>
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
				label={m.ops_active()}
				checked={p.active}
				onChange={(active) => setValue({ ...p, active })}
			/>
			<ParentPicker
				name="courseIds"
				kind="courses"
				label={m.ops_add_courses()}
				value={p.courseIds}
				onChange={(ids) => {
					const id = ids[0];
					if (!p.courseIds.includes(id) && p.courseIds.length < 50)
						setValue({ ...p, courseIds: [...p.courseIds, id] });
				}}
			/>
			<fieldset className="grid gap-2">
				<legend>{m.ops_selected_courses({ count: p.courseIds.length })}</legend>
				{p.courseIds.map((id) => (
					<div key={id} className="flex gap-3 items-center">
						<Link
							search={api.studioSearch.parse({})}
							to="/admin/courses/$courseId"
							params={{ courseId: id }}
							className="break-all text-sm underline"
						>
							{labels.data?.find((c) => c.id === id)?.title ??
								m.ops_loading_courses()}
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
							{m.ops_remove()}
						</Button>
					</div>
				))}
			</fieldset>
			{p.courseIds.length === 0 && <p>{m.ops_select_course()}</p>}
			<EditorActions editor={editor} />
		</EditorForm>
	);
}
