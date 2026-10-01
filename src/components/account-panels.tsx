import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import * as api from "../server/functions";

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
		const body = password
			? {
					currentPassword: form.get("currentPassword"),
					newPassword: form.get("newPassword"),
					revokeOtherSessions: true,
				}
			: { name: form.get("name") };
		try {
			const result = await fetch(
				`/api/auth/${password ? "change-password" : "update-user"}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				},
			);
			if (!result.ok)
				throw new Error("Perubahan tidak dapat disimpan. Semak maklumat anda.");
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
			<section className="empty error">
				<h1>Tetapan akaun</h1>
				<a href="/login">Log masuk untuk mengurus akaun.</a>
			</section>
		);
	return (
		<section className="section">
			<h1 className="page-title">Tetapan akaun</h1>
			<p>{viewer.data.email}</p>
			<div className="admin-grid">
				<form className="admin-form" onSubmit={(event) => void submit(event)}>
					<h2>Profil</h2>
					<label>
						Nama
						<input
							name="name"
							required
							maxLength={200}
							defaultValue={viewer.data.name}
						/>
					</label>
					<button type="submit" className="button" disabled={busy}>
						Simpan profil
					</button>
				</form>
				<form
					className="admin-form"
					onSubmit={(event) => void submit(event, true)}
				>
					<h2>Kata laluan</h2>
					<label>
						Kata laluan semasa
						<input
							type="password"
							name="currentPassword"
							autoComplete="current-password"
							required
						/>
					</label>
					<label>
						Kata laluan baharu
						<input
							type="password"
							name="newPassword"
							autoComplete="new-password"
							minLength={10}
							required
						/>
					</label>
					<button type="submit" className="button" disabled={busy}>
						Tukar kata laluan
					</button>
				</form>
			</div>
			{message && <p role="status">{message}</p>}
		</section>
	);
}

export function AdminOperations() {
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
		<section className="operations">
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
			{message && <p role="status">{message}</p>}
			<button
				type="button"
				className="button secondary"
				disabled={busy}
				onClick={() => void perform(() => api.retryReceipts())}
			>
				Cuba semula email tertunda
			</button>
			<div className="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Pesanan</th>
							<th>Pelajar</th>
							<th>Status</th>
							<th>Tindakan</th>
						</tr>
					</thead>
					<tbody>
						{orders.data.orders.map((order) => (
							<tr key={order.id}>
								<td>
									{order.productTitle}
									<small>{order.id}</small>
								</td>
								<td>{order.email}</td>
								<td>{order.status}</td>
								<td>
									{order.billId && order.status !== "paid" && (
										<button
											type="button"
											disabled={busy}
											onClick={() =>
												void perform(() =>
													api.reconcileOrder({ data: { orderId: order.id } }),
												)
											}
										>
											Semak Billplz
										</button>
									)}
									{order.status === "paid" && (
										<button
											type="button"
											disabled={busy}
											onClick={() => {
												const reason = window.prompt(
													"Rekod hanya selepas wang dipulangkan melalui Billplz/bank. Masukkan sebab refund:",
												);
												if (reason && reason.trim().length >= 5)
													void perform(() =>
														api.recordRefund({
															data: { orderId: order.id, reason },
														}),
													);
											}}
										>
											Rekod refund selesai
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<h3>Email pembelian</h3>
			<div className="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Order</th>
							<th>Status</th>
							<th>Percubaan</th>
						</tr>
					</thead>
					<tbody>
						{d.receipts.map((receipt) => (
							<tr key={receipt.orderId}>
								<td>{receipt.orderId}</td>
								<td>
									{receipt.sentAt
										? receipt.deliveryStatus
										: receipt.lastError
											? "Gagal / menunggu retry"
											: "Menunggu"}
								</td>
								<td>{receipt.attempts}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<h3>Sumber akses</h3>
			<div className="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Pelajar</th>
							<th>Kursus</th>
							<th>Sumber</th>
							<th>Tindakan</th>
						</tr>
					</thead>
					<tbody>
						{d.grants.map((grant) => (
							<tr key={grant.id}>
								<td>
									{orders.data?.users.find((user) => user.id === grant.userId)
										?.email ?? grant.userId}
								</td>
								<td>
									{orders.data?.courses.find(
										(course) => course.id === grant.courseId,
									)?.title ?? grant.courseId}
								</td>
								<td>
									{grant.source}
									{grant.revokedAt ? " (ditarik)" : ""}
								</td>
								<td>
									{grant.source === "manual" && !grant.revokedAt && (
										<button
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
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<details>
				<summary>Audit operasi admin</summary>
				<ul>
					{d.audit.map((entry) => (
						<li key={entry.id}>
							{new Date(entry.createdAt).toLocaleString("ms-MY")} ·{" "}
							{entry.actorId} · {entry.action}
						</li>
					))}
				</ul>
			</details>
		</section>
	);
}
