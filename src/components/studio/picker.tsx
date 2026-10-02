import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import * as api from "../../server/studio";
import { Button } from "../ui/button";
import {
	Pagination,
	QueryState,
	SearchField,
	useEditorFieldError,
} from "./common";

export function useChoiceLabels(
	kind: "courses" | "sections" | "users",
	ids: string[],
) {
	return useQuery({
		queryKey: ["studio", "choice-labels", kind, ids],
		queryFn: () => api.getAdminChoiceLabels({ data: { kind, ids } }),
		enabled: ids.length > 0,
	});
}

export function ParentPicker({
	kind,
	parentId,
	value,
	onChange,
	label,
	name,
}: {
	kind: "courses" | "sections" | "users";
	parentId?: string;
	value: string[];
	onChange: (ids: string[]) => void;
	label: string;
	name?: string;
}) {
	const errorId = useId();
	const fieldset = useRef<HTMLFieldSetElement>(null);
	const { error, first } = useEditorFieldError(name);
	useEffect(() => {
		if (error && first) fieldset.current?.focus();
	}, [error, first]);
	const [q, setQ] = useState("");
	const [page, setPage] = useState(1);
	const labels = useChoiceLabels(kind, value);
	const query = useQuery({
		queryKey: ["studio", "picker", kind, parentId, q, page],
		queryFn: async () => {
			if (kind === "courses")
				return api.listAdminCourses({ data: { q, page } });
			if (kind === "users")
				return api.listAdminUserChoices({ data: { q, page } });
			return api.listAdminSections({
				data: { parentId: parentId ?? "", q, page },
			});
		},
		enabled: kind !== "sections" || Boolean(parentId),
	});
	return (
		<fieldset
			ref={fieldset}
			tabIndex={-1}
			aria-invalid={Boolean(error)}
			aria-describedby={error ? errorId : undefined}
			className="grid gap-3 rounded-lg border p-4 min-w-0"
		>
			<legend className="px-1 text-sm font-medium">{label}</legend>
			{error && (
				<p id={errorId} role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<SearchField
				label={`Cari ${label.toLowerCase()}`}
				value={q}
				onChange={(v) => {
					setQ(v);
					setPage(1);
				}}
			/>
			<QueryState query={query} />
			<div className="grid gap-1 max-h-64 overflow-y-auto">
				{query.data?.items.map((item) => (
					<Button
						key={item.id}
						type="button"
						variant={value.includes(item.id) ? "secondary" : "ghost"}
						aria-pressed={value.includes(item.id)}
						className="justify-start h-auto min-h-11 whitespace-normal text-left break-words"
						onClick={() => onChange([item.id])}
					>
						{value.includes(item.id) ? "✓ " : ""}
						{item.title}
					</Button>
				))}
			</div>
			{query.data?.items.length === 0 && <p>Tiada keputusan.</p>}
			<Pagination data={query.data} onPage={setPage} />
			{value.length > 0 && (
				<div>
					<p className="text-sm font-medium">Dipilih</p>
					<p className="break-all text-xs text-muted-foreground">
						{value
							.map(
								(id) =>
									labels.data?.find((item) => item.id === id)?.title ??
									"Memuatkan pilihan…",
							)
							.join(", ")}
					</p>
				</div>
			)}
		</fieldset>
	);
}
