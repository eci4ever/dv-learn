import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as m from "../../paraglide/messages.js";
import { getLocale } from "../../paraglide/runtime.js";
import { recordRefund, retryReceipts } from "../../server/functions";
import * as api from "../../server/studio";
import { operationErrorMessage, useActionDialog } from "../action-dialog";
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
			<h2>{m.ops_sales_operations()}</h2>
			<QueryState query={summary} />
			{summary.data && (
				<div className="grid gap-3 sm:grid-cols-3">
					<div className="rounded-lg border p-4">
						<p>{m.ops_net_sales()}</p>
						<strong>{money(summary.data.revenueCents)}</strong>
						<p className="text-sm text-muted-foreground">
							{m.ops_excludes_refunds()}
						</p>
					</div>
					<div className="rounded-lg border p-4">
						<p>{m.ops_paid_pending()}</p>
						<strong>
							{summary.data.paid ?? 0} / {summary.data.pending ?? 0}
						</strong>
					</div>
					<div className="rounded-lg border p-4">
						<p>{m.ops_unsent_receipts()}</p>
						<strong>{summary.data.receiptsPending}</strong>
					</div>
				</div>
			)}
			<fieldset
				className="flex flex-wrap gap-2"
				aria-label={m.ops_operations()}
			>
				{[
					["orders", m.ops_orders()],
					["receipts", m.ops_receipts()],
					["audit", m.ops_audit()],
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
			setMessage(m.ops_action_completed());
		} catch (e) {
			setMessage(operationErrorMessage(e));
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
					label={m.ops_search_orders()}
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label={m.ops_order_status()}
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", m.ops_all()],
						["pending", m.ops_pending()],
						["paid", m.ops_paid()],
						["refunded", m.ops_refunded()],
						["failed", m.ops_failed()],
					]}
				/>
			</div>
			{operation.message && <p role="status">{operation.message}</p>}
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList>{m.ops_empty()}</EmptyList>}
			<ul className="grid gap-3">
				{query.data?.items.map((o) => (
					<li className="studio-row" key={o.id}>
						<div className="min-w-0">
							<p className="font-medium break-words">
								{o.productTitle} · {money(o.amountCents)}
							</p>
							<p className="break-words">{o.email}</p>
							<p className="break-all text-sm text-muted-foreground">
								{o.id} · {orderStatus(o.status)}
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
									{m.ops_check_billplz()}
								</Button>
							)}
							{o.status === "paid" && (
								<Button
									variant="outline"
									disabled={operation.busy}
									onClick={async () => {
										const reason = await operation.confirmAction({
											description: m.ops_refund_confirmation({
												amount: money(o.amountCents),
												email: o.email,
											}),
											confirmLabel: m.ops_record_refund(),
											reason: true,
											minLength: 5,
										});
										if (reason)
											await operation.perform(() =>
												recordRefund({ data: { orderId: o.id, reason } }),
											);
									}}
								>
									{m.ops_record_refund()}
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
							description: m.ops_retry_confirmation(),
							confirmLabel: m.ops_retry_receipts(),
						})
					)
						await operation.perform(() => retryReceipts());
				}}
			>
				{m.ops_retry_receipts()}
			</Button>
			<div className="flex flex-wrap gap-3 items-end">
				<SearchField
					label={m.ops_search_receipts()}
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label={m.ops_receipt_status()}
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", m.ops_all()],
						["sent", m.ops_sent()],
						["unsent", m.ops_not_sent()],
					]}
				/>
			</div>
			{operation.message && <p role="status">{operation.message}</p>}
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList>{m.ops_empty()}</EmptyList>}
			<ul className="grid gap-3">
				{query.data?.items.map((r) => (
					<li key={r.orderId} className="rounded-lg border p-4 break-words">
						<p className="font-medium">{r.recipient}</p>
						<p className="text-sm break-all">{r.orderId}</p>
						<p>
							{m.ops_receipt_summary({
								sent: r.sentAt ? m.ops_sent() : m.ops_not_sent(),
								delivery: deliveryStatus(r.deliveryStatus),
								count: r.attempts,
							})}
						</p>
						{r.lastError && (
							<p className="text-destructive">{m.ops_receipt_error()}</p>
						)}
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
				label={m.ops_search_audit()}
				value={search.q}
				onChange={(q) => update({ q })}
			/>
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList>{m.ops_empty()}</EmptyList>}
			<ul className="grid gap-3">
				{query.data?.items.map((a) => (
					<li key={a.id} className="rounded-lg border p-4">
						<p className="font-medium break-words">{a.action}</p>
						<p className="text-sm break-all">
							{a.actorId} · {a.entityId}
						</p>
						<p className="text-sm text-muted-foreground">
							{new Date(a.createdAt).toLocaleString(
								getLocale() === "ms" ? "ms-MY" : "en-MY",
							)}
						</p>
					</li>
				))}
			</ul>
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</div>
	);
}

function orderStatus(status: string) {
	switch (status) {
		case "pending":
			return m.ops_pending();
		case "paid":
			return m.ops_paid();
		case "refunded":
			return m.ops_refunded();
		case "failed":
			return m.ops_failed();
		default:
			return status;
	}
}
function deliveryStatus(status: string) {
	status = status.replace(/^email\./, "");
	switch (status) {
		case "pending":
			return m.ops_pending();
		case "sent":
			return m.ops_sent();
		case "delivered":
			return m.ops_delivered();
		case "failed":
			return m.ops_failed();
		case "queued":
			return m.ops_queued();
		case "sending":
			return m.ops_sending();
		case "bounced":
			return m.ops_bounced();
		case "complained":
			return m.ops_complained();
		default:
			return m.ops_delivery_unknown();
	}
}
