import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { getViewer } from "../server/functions";
import { useActionDialog } from "./action-dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card as UiCard } from "./ui/card";
import { Pagination, PaginationContent, PaginationItem } from "./ui/pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";

export function AdminUsers() {
	const { confirmAction, actionDialog } = useActionDialog();
	const [offset, setOffset] = useState(0);
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const viewer = useQuery({ queryKey: ["viewer"], queryFn: () => getViewer() });
	const users = useQuery({
		queryKey: ["admin-users", offset],
		queryFn: async () => {
			const result = await authClient.admin.listUsers({
				query: {
					limit: 20,
					offset,
					sortBy: "createdAt",
					sortDirection: "desc",
				},
			});
			if (result.error) throw new Error(result.error.message);
			return result.data;
		},
	});
	async function perform(
		action: () => Promise<{ error: { message?: string } | null }>,
	) {
		setBusy(true);
		setMessage("");
		try {
			const result = await action();
			if (result.error) throw new Error(result.error.message);
			await users.refetch();
			setMessage("Pengguna dikemas kini.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Operasi gagal.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<UiCard className="gap-0 p-6">
			<section className="operations">
				{actionDialog}
				<h2>Pengguna dan peranan</h2>
				<p>
					Pengurusan pengguna melalui Better Auth Admin. Akses kursus diurus
					secara berasingan.
				</p>
				{(message || users.error) && (
					<Alert role="status">
						<AlertDescription>
							{message || users.error?.message}
						</AlertDescription>
					</Alert>
				)}
				<div className="table-wrap">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Pengguna</TableHead>
								<TableHead>Peranan</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Tindakan</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.data?.users.map((user) => (
								<TableRow key={user.id}>
									<TableCell>
										{user.name}
										<br />
										{user.email}
									</TableCell>
									<TableCell>
										<Badge variant="outline">{user.role}</Badge>
									</TableCell>
									<TableCell>
										<Badge variant={user.banned ? "destructive" : "secondary"}>
											{user.banned ? "Disekat" : "Aktif"}
										</Badge>
									</TableCell>
									<TableCell>
										<Button
											type="button"
											disabled={busy || user.id === viewer.data?.id}
											onClick={async () => {
												const role = user.role === "admin" ? "user" : "admin";
												if (
													await confirmAction({
														description: `Tukar peranan ${user.email} kepada ${role}?`,
													})
												)
													void perform(() =>
														authClient.admin.setRole({ userId: user.id, role }),
													);
											}}
										>
											Tukar peranan
										</Button>{" "}
										<Button
											type="button"
											disabled={busy || user.id === viewer.data?.id}
											onClick={async () => {
												if (user.banned)
													void perform(() =>
														authClient.admin.unbanUser({ userId: user.id }),
													);
												else {
													const reason = await confirmAction({
														description: "Sebab menyekat pengguna:",
														reason: true,
													});
													if (reason?.trim())
														void perform(() =>
															authClient.admin.banUser({
																userId: user.id,
																banReason: reason.trim(),
															}),
														);
												}
											}}
										>
											{user.banned ? "Buka sekatan" : "Sekat"}
										</Button>{" "}
										<Button
											type="button"
											disabled={busy}
											onClick={async () => {
												if (
													await confirmAction({
														description: `Batalkan semua sesi ${user.email}?`,
													})
												)
													void perform(() =>
														authClient.admin.revokeUserSessions({
															userId: user.id,
														}),
													);
											}}
										>
											Batalkan sesi
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
				<Pagination aria-label="Halaman pengguna">
					<PaginationContent>
						<PaginationItem>
							<Button
								type="button"
								disabled={busy || offset === 0}
								onClick={() => setOffset(Math.max(0, offset - 20))}
							>
								Sebelumnya
							</Button>
						</PaginationItem>
						<PaginationItem>
							<Button
								type="button"
								disabled={
									busy || !users.data || offset + 20 >= users.data.total
								}
								onClick={() => setOffset(offset + 20)}
							>
								Seterusnya
							</Button>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</section>
		</UiCard>
	);
}
