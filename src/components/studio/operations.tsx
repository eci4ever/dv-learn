import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { recordRefund, retryReceipts } from "../../server/functions";
import * as api from "../../server/studio";
import { useActionDialog } from "../action-dialog";
import { Button } from "../ui/button";
import {
	EmptyList,
	Filter,
	keys,
	money,
	Pagination,
	QueryState,
	SearchField,
	useStudioSearch,
} from "./common";

export function OperationsPage() {
	const { search, update } = useStudioSearch();
	const tab = ["receipts", "audit"].includes(search.tab)
		? search.tab
		: "orders";
	const summary = useQuery({
		queryKey: keys.summary,
		queryFn: () => api.getAdminOperationsSummary(),
	});
	return (
		<section className="grid gap-5">
			<h2>Jualan/Operasi</h2>
			<QueryState query={summary} />
			{summary.data && (
				<div className="grid gap-3 sm:grid-cols-3">
					<div className="rounded-lg border p-4">
						<p>Jualan bersih direkodkan</p>
						<strong>{money(summary.data.revenueCents)}</strong>
						<p className="text-sm text-muted-foreground">
							Tidak termasuk pesanan refunded
						</p>
					</div>
					<div className="rounded-lg border p-4">
						<p>Pesanan paid / pending</p>
						<strong>
							{summary.data.paid ?? 0} / {summary.data.pending ?? 0}
						</strong>
					</div>
					<div className="rounded-lg border p-4">
						<p>Resit belum dihantar</p>
						<strong>{summary.data.receiptsPending}</strong>
					</div>
				</div>
			)}
			<fieldset className="flex flex-wrap gap-2" aria-label="Bahagian operasi">
				{[
					["orders", "Pesanan"],
					["receipts", "Resit"],
					["audit", "Audit"],
				].map(([value, label]) => (
					<Button
						key={value}
						aria-pressed={tab === value}
						variant={tab === value ? "secondary" : "outline"}
						onClick={() =>
							update({
								tab: api.studioSearch.shape.tab.parse(value),
								status: "all",
								q: "",
							})
						}
					>
						{label}
					</Button>
				))}
			</fieldset>
			{tab === "orders" ? (
				<OrdersPanel />
			) : tab === "receipts" ? (
				<ReceiptsPanel />
			) : (
				<AuditPanel />
			)}
		</section>
	);
}
function useOperation(invalidate: readonly unknown[][]) {
	const client = useQueryClient();
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const dialog = useActionDialog();
	async function perform(action: () => Promise<unknown>) {
		setBusy(true);
		setMessage("");
		try {
			await action();
			await Promise.all(
				[...invalidate, keys.summary].map((queryKey) =>
					client.invalidateQueries({ queryKey }),
				),
			);
			setMessage("Operasi selesai.");
		} catch (e) {
			setMessage(
				e instanceof Error ? e.message : "Operasi gagal. Cuba semula.",
			);
		} finally {
			setBusy(false);
		}
	}
	return { busy, message, perform, ...dialog };
}
function OrdersPanel() {
	const { search, update } = useStudioSearch();
	const operation = useOperation([keys.orders, keys.receipts, keys.access]);
	const query = useQuery({
		queryKey: [...keys.orders, search],
		queryFn: () => api.listAdminOrders({ data: search }),
	});
	return (
		<div className="grid gap-4">
			{operation.actionDialog}
			<div className="flex flex-wrap gap-3 items-end">
				<SearchField
					label="Cari pesanan, e-mel atau produk"
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label="Status pesanan"
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", "Semua"],
						["pending", "Pending"],
						["paid", "Paid"],
						["refunded", "Refunded"],
						["failed", "Failed"],
					]}
				/>
			</div>
			{operation.message && <p role="status">{operation.message}</p>}
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList />}
			<ul className="grid gap-3">
				{query.data?.items.map((o) => (
					<li className="studio-row" key={o.id}>
						<div className="min-w-0">
							<p className="font-medium break-words">
								{o.productTitle} · {money(o.amountCents)}
							</p>
							<p className="break-words">{o.email}</p>
							<p className="break-all text-sm text-muted-foreground">
								{o.id} · {o.status}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{o.billId && o.status !== "paid" && o.status !== "refunded" && (
								<Button
									variant="outline"
									disabled={operation.busy}
									onClick={() =>
										operation.perform(() =>
											api.reconcileAdminOrder({ data: { orderId: o.id } }),
										)
									}
								>
									Semak Billplz
								</Button>
							)}
							{o.status === "paid" && (
								<Button
									variant="outline"
									disabled={operation.busy}
									onClick={async () => {
										const reason = await operation.confirmAction({
											description: `Rekod refund ${money(o.amountCents)} untuk ${o.email}? Lakukan bayaran balik di luar sistem terlebih dahulu. Tindakan ini tidak menghantar wang; ia merekod refund dan menarik akses yang diberikan oleh pesanan ini.`,
											reason: true,
											minLength: 5,
										});
										if (reason)
											await operation.perform(() =>
												recordRefund({ data: { orderId: o.id, reason } }),
											);
									}}
								>
									Rekod refund
								</Button>
							)}
						</div>
					</li>
				))}
			</ul>
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</div>
	);
}
function ReceiptsPanel() {
	const { search, update } = useStudioSearch();
	const operation = useOperation([keys.receipts]);
	const query = useQuery({
		queryKey: [...keys.receipts, search],
		queryFn: () => api.listAdminReceipts({ data: search }),
	});
	return (
		<div className="grid gap-4">
			{operation.actionDialog}
			<Button
				className="justify-self-start"
				disabled={operation.busy}
				onClick={async () => {
					if (
						await operation.confirmAction({
							description:
								"Cuba semula sehingga 20 resit belum dihantar? E-mel resit akan dihantar kepada pelanggan berkaitan.",
						})
					)
						await operation.perform(() => retryReceipts());
				}}
			>
				Retry resit belum dihantar
			</Button>
			<div className="flex flex-wrap gap-3 items-end">
				<SearchField
					label="Cari resit atau e-mel"
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label="Status resit"
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", "Semua"],
						["sent", "Dihantar"],
						["unsent", "Belum dihantar"],
					]}
				/>
			</div>
			{operation.message && <p role="status">{operation.message}</p>}
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList />}
			<ul className="grid gap-3">
				{query.data?.items.map((r) => (
					<li key={r.orderId} className="rounded-lg border p-4 break-words">
						<p className="font-medium">{r.recipient}</p>
						<p className="text-sm break-all">{r.orderId}</p>
						<p>
							{r.sentAt ? "Dihantar" : "Belum dihantar"} · {r.deliveryStatus} ·{" "}
							{r.attempts} cubaan
						</p>
						{r.lastError && <p className="text-destructive">{r.lastError}</p>}
					</li>
				))}
			</ul>
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</div>
	);
}
function AuditPanel() {
	const { search, update } = useStudioSearch();
	const query = useQuery({
		queryKey: [...keys.audit, search],
		queryFn: () => api.listAdminAudit({ data: search }),
	});
	return (
		<div className="grid gap-4">
			<SearchField
				label="Cari tindakan, actor atau rekod"
				value={search.q}
				onChange={(q) => update({ q })}
			/>
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList />}
			<ul className="grid gap-3">
				{query.data?.items.map((a) => (
					<li key={a.id} className="rounded-lg border p-4">
						<p className="font-medium break-words">{a.action}</p>
						<p className="text-sm break-all">
							{a.actorId} · {a.entityId}
						</p>
						<p className="text-sm text-muted-foreground">
							{new Date(a.createdAt).toLocaleString("ms-MY")}
						</p>
					</li>
				))}
			</ul>
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</div>
	);
}
