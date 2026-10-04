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
			<h2>Sales and operations</h2>
			<QueryState query={summary} />
			{summary.data && (
				<div className="grid gap-3 sm:grid-cols-3">
					<div className="rounded-lg border p-4">
						<p>Recorded net sales</p>
						<strong>{money(summary.data.revenueCents)}</strong>
						<p className="text-sm text-muted-foreground">
							Excludes refunded orders
						</p>
					</div>
					<div className="rounded-lg border p-4">
						<p>Orders paid / pending</p>
						<strong>
							{summary.data.paid ?? 0} / {summary.data.pending ?? 0}
						</strong>
					</div>
					<div className="rounded-lg border p-4">
						<p>Unsent receipts</p>
						<strong>{summary.data.receiptsPending}</strong>
					</div>
				</div>
			)}
			<fieldset className="flex flex-wrap gap-2" aria-label="Operations">
				{[
					["orders", "Orders"],
					["receipts", "Receipts"],
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
			setMessage("Action completed.");
		} catch (e) {
			setMessage(
				e instanceof Error
					? e.message
					: "Unable to complete the action. Please try again.",
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
					label="Search order, email or product"
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label="Order status"
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", "All"],
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
									Check Billplz
								</Button>
							)}
							{o.status === "paid" && (
								<Button
									variant="outline"
									disabled={operation.busy}
									onClick={async () => {
										const reason = await operation.confirmAction({
											description: `Record a refund of ${money(o.amountCents)} for ${o.email}? Refund the payment outside this system first. This action does not send money. It records the refund and revokes access granted by this order.`,
											reason: true,
											minLength: 5,
										});
										if (reason)
											await operation.perform(() =>
												recordRefund({ data: { orderId: o.id, reason } }),
											);
									}}
								>
									Record refund
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
								"Retry up to 20 unsent receipts? Receipt emails will be sent to the affected customers.",
						})
					)
						await operation.perform(() => retryReceipts());
				}}
			>
				Retry unsent receipts
			</Button>
			<div className="flex flex-wrap gap-3 items-end">
				<SearchField
					label="Search receipt or email"
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label="Receipt status"
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", "All"],
						["sent", "Sent"],
						["unsent", "Not sent"],
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
							{r.sentAt ? "Sent" : "Not sent"} · {r.deliveryStatus} ·{" "}
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
				label="Search action, actor or record"
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
							{new Date(a.createdAt).toLocaleString("en-MY")}
						</p>
					</li>
				))}
			</ul>
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</div>
	);
}
