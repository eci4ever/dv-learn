import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { grantAccess, revokeManualAccess } from "../../server/functions";
import * as api from "../../server/studio";
import { useActionDialog } from "../action-dialog";
import { Button } from "../ui/button";
import {
	EmptyList,
	Filter,
	keys,
	Pagination,
	QueryState,
	SearchField,
	useStudioSearch,
} from "./common";
import { ParentPicker } from "./picker";

export function AccessPage() {
	const { search, update } = useStudioSearch();
	const client = useQueryClient();
	const { confirmAction, actionDialog } = useActionDialog();
	const [grantOpen, setGrantOpen] = useState(false);
	const [userId, setUserId] = useState("");
	const [courseId, setCourseId] = useState("");
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const query = useQuery({
		queryKey: [...keys.access, search],
		queryFn: () => api.listAdminAccess({ data: search }),
	});
	async function perform(action: () => Promise<unknown>) {
		setBusy(true);
		setMessage("");
		try {
			await action();
			await client.invalidateQueries({ queryKey: keys.access });
			setMessage("Akses dikemas kini.");
		} catch (e) {
			setMessage(
				e instanceof Error ? e.message : "Operasi gagal. Cuba semula.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<section className="grid gap-5">
			{actionDialog}
			<div className="flex flex-wrap justify-between gap-3">
				<h2>Akses kursus</h2>
				<Button onClick={() => setGrantOpen(!grantOpen)}>
					{grantOpen ? "Tutup borang" : "Beri akses manual"}
				</Button>
			</div>
			<p className="text-muted-foreground">
				Akses manual berasingan daripada akses pesanan. Menarik akses manual
				tidak membatalkan pembelian.
			</p>
			{message && <p role="status">{message}</p>}
			{grantOpen && (
				<form
					className="studio-form"
					onSubmit={async (e) => {
						e.preventDefault();
						if (
							await confirmAction({
								description:
									"Beri akses manual kepada kursus dipilih? Pengguna akan boleh membuka semua kandungan diterbitkan dalam kursus.",
							})
						)
							await perform(() => grantAccess({ data: { userId, courseId } }));
					}}
				>
					<ParentPicker
						kind="users"
						label="Pengguna"
						value={userId ? [userId] : []}
						onChange={(ids) => setUserId(ids[0])}
					/>
					<ParentPicker
						kind="courses"
						label="Kursus"
						value={courseId ? [courseId] : []}
						onChange={(ids) => setCourseId(ids[0])}
					/>
					<Button type="submit" disabled={busy || !userId || !courseId}>
						Beri akses
					</Button>
				</form>
			)}
			<div className="flex flex-wrap gap-3 items-end">
				<SearchField
					label="Cari nama, e-mel atau kursus"
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label="Sumber"
					value={search.source}
					onChange={(source) =>
						update({ source: api.studioSearch.shape.source.parse(source) })
					}
					options={[
						["all", "Semua"],
						["manual", "Manual"],
						["order", "Pesanan"],
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
						["active", "Aktif"],
						["revoked", "Ditarik"],
					]}
				/>
			</div>
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList />}
			<ul className="grid gap-3">
				{query.data?.items.map((a) => (
					<li key={a.id} className="studio-row">
						<div className="min-w-0">
							<p className="break-words font-medium">{a.email}</p>
							<p className="break-words">{a.courseTitle}</p>
							<p className="text-sm text-muted-foreground">
								{a.source} · {a.revokedAt ? "Ditarik" : "Aktif"}
							</p>
						</div>
						{a.source === "manual" && !a.revokedAt && (
							<Button
								variant="outline"
								disabled={busy}
								onClick={async () => {
									if (
										await confirmAction({
											description: `Tarik akses manual ${a.email} kepada ${a.courseTitle}? Akses daripada pesanan kekal; progress tidak dipadam.`,
										})
									)
										await perform(() =>
											revokeManualAccess({
												data: { userId: a.userId, courseId: a.courseId },
											}),
										);
								}}
							>
								Tarik akses manual
							</Button>
						)}
					</li>
				))}
			</ul>
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</section>
	);
}
