import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import * as api from "../server/functions";
import { useActionDialog } from "./action-dialog";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card as UiCard } from "./ui/card";
import { Empty } from "./ui/empty";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";

export function Settings() {
	const viewer = useQuery({
		queryKey: ["viewer"],
		queryFn: () => api.getViewer(),
	});
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	async function submit(
		event: React.FormEvent<HTMLFormElement>,
		password = false,
	) {
		event.preventDefault();
		setBusy(true);
		setMessage("");
		const form = new FormData(event.currentTarget);
		try {
			const result = password
				? await authClient.changePassword({
						currentPassword: String(form.get("currentPassword") ?? ""),
						newPassword: String(form.get("newPassword") ?? ""),
						revokeOtherSessions: true,
					})
				: await authClient.updateUser({ name: String(form.get("name") ?? "") });
			if (result.error)
				throw new Error(
					result.error.message ?? "Perubahan tidak dapat disimpan.",
				);
			setMessage("Perubahan berjaya disimpan.");
			await viewer.refetch();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Sila cuba semula.");
		} finally {
			setBusy(false);
		}
	}
	if (!viewer.data)
		return (
			<Empty className="empty error">
				<h1>Tetapan akaun</h1>
				<a href="/login">Log masuk untuk mengurus akaun.</a>
			</Empty>
		);
	return (
		<section className="section">
			<h1 className="page-title">Tetapan akaun</h1>
			<p>{viewer.data.email}</p>
			<div className="admin-grid">
				<UiCard className="gap-0 p-6">
					<form className="admin-form" onSubmit={(event) => void submit(event)}>
						<h2>Profil</h2>
						<Label className="flex-col items-stretch">
							Nama
							<Input
								name="name"
								required
								maxLength={200}
								defaultValue={viewer.data.name}
							/>
						</Label>
						<Button type="submit" className="button" disabled={busy}>
							Simpan profil
						</Button>
					</form>
				</UiCard>
				<UiCard className="gap-0 p-6">
					<form
						className="admin-form"
						onSubmit={(event) => void submit(event, true)}
					>
						<h2>Kata laluan</h2>
						<Label className="flex-col items-stretch">
							Kata laluan semasa
							<Input
								type="password"
								name="currentPassword"
								autoComplete="current-password"
								required
							/>
						</Label>
						<Label className="flex-col items-stretch">
							Kata laluan baharu
							<Input
								type="password"
								name="newPassword"
								autoComplete="new-password"
								minLength={10}
								required
							/>
						</Label>
						<Button type="submit" className="button" disabled={busy}>
							Tukar kata laluan
						</Button>
					</form>
				</UiCard>
			</div>
			{message && (
				<Alert role="status">
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			)}
		</section>
	);
}

export function AdminOperations() {
	const { confirmAction, actionDialog } = useActionDialog();
	const orders = useQuery({
		queryKey: ["admin"],
		queryFn: () => api.getAdminData(),
	});
	const operations = useQuery({
		queryKey: ["operations"],
		queryFn: () => api.getOperations(),
	});
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	async function perform(action: () => Promise<unknown>) {
		setBusy(true);
		try {
			await action();
			await Promise.all([operations.refetch(), orders.refetch()]);
			setMessage("Operasi selesai.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Operasi gagal.");
		} finally {
			setBusy(false);
		}
	}
	if (!orders.data || !operations.data) return null;
	const d = operations.data;
	return (
		<UiCard className="gap-0 p-6">
			<section className="operations">
				{actionDialog}
				<h2>Operasi dan jualan</h2>
				<p>
					{orders.data.orders.length} pesanan · {orders.data.users.length}{" "}
					pengguna · RM{" "}
					{(
						orders.data.orders
							.filter((order) => order.status === "paid")
							.reduce((sum, order) => sum + order.amountCents, 0) / 100
					).toFixed(2)}{" "}
					jualan dalam senarai
				</p>
				{message && (
					<Alert role="status">
						<AlertDescription>{message}</AlertDescription>
					</Alert>
				)}
				<Button
					type="button"
					className="button secondary"
					variant="secondary"
					disabled={busy}
					onClick={() => void perform(() => api.retryReceipts())}
				>
					Cuba semula email tertunda
				</Button>
				<div className="table-wrap">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Pesanan</TableHead>
								<TableHead>Pelajar</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Tindakan</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.data.orders.map((order) => (
								<TableRow key={order.id}>
									<TableCell>
										{order.productTitle}
										<small>{order.id}</small>
									</TableCell>
									<TableCell>{order.email}</TableCell>
									<TableCell>
										<Badge variant="secondary">{order.status}</Badge>
									</TableCell>
									<TableCell>
										{order.billId && order.status !== "paid" && (
											<Button
												type="button"
												disabled={busy}
												onClick={() =>
													void perform(() =>
														api.reconcileOrder({ data: { orderId: order.id } }),
													)
												}
											>
												Semak Billplz
											</Button>
										)}
										{order.status === "paid" && (
											<Button
												type="button"
												disabled={busy}
												onClick={async () => {
													const reason = await confirmAction({
														description:
															"Rekod hanya selepas wang dipulangkan melalui Billplz/bank. Masukkan sebab refund:",
														reason: true,
														minLength: 5,
													});
													if (reason && reason.trim().length >= 5)
														void perform(() =>
															api.recordRefund({
																data: { orderId: order.id, reason },
															}),
														);
												}}
											>
												Rekod refund selesai
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
				<h3>Email pembelian</h3>
				<div className="table-wrap">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Order</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Percubaan</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{d.receipts.map((receipt) => (
								<TableRow key={receipt.orderId}>
									<TableCell>{receipt.orderId}</TableCell>
									<TableCell>
										{receipt.sentAt
											? receipt.deliveryStatus
											: receipt.lastError
												? "Gagal / menunggu retry"
												: "Menunggu"}
									</TableCell>
									<TableCell>{receipt.attempts}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
				<h3>Sumber akses</h3>
				<div className="table-wrap">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Pelajar</TableHead>
								<TableHead>Kursus</TableHead>
								<TableHead>Sumber</TableHead>
								<TableHead>Tindakan</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{d.grants.map((grant) => (
								<TableRow key={grant.id}>
									<TableCell>
										{orders.data?.users.find((user) => user.id === grant.userId)
											?.email ?? grant.userId}
									</TableCell>
									<TableCell>
										{orders.data?.courses.find(
											(course) => course.id === grant.courseId,
										)?.title ?? grant.courseId}
									</TableCell>
									<TableCell>
										{grant.source}
										{grant.revokedAt ? " (ditarik)" : ""}
									</TableCell>
									<TableCell>
										{grant.source === "manual" && !grant.revokedAt && (
											<Button
												type="button"
												disabled={busy}
												onClick={() =>
													void perform(() =>
														api.revokeManualAccess({
															data: {
																userId: grant.userId,
																courseId: grant.courseId,
															},
														}),
													)
												}
											>
												Tarik akses manual
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
				<Accordion>
					<AccordionItem value="audit">
						<AccordionTrigger>Audit operasi admin</AccordionTrigger>
						<AccordionContent>
							<ul>
								{d.audit.map((entry) => (
									<li key={entry.id}>
										{new Date(entry.createdAt).toLocaleString("ms-MY")} ·{" "}
										{entry.actorId} · {entry.action}
									</li>
								))}
							</ul>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</section>
		</UiCard>
	);
}
