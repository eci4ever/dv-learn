import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { getViewer } from "../server/functions";
import { listAdminUsers } from "../server/studio";
import { useActionDialog } from "./action-dialog";
import {
	EmptyList,
	QueryState,
	SearchField,
	Pagination as StudioPagination,
	useStudioSearch,
} from "./studio/common";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card as UiCard } from "./ui/card";
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
	const { search, update } = useStudioSearch();
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const viewer = useQuery({ queryKey: ["viewer"], queryFn: () => getViewer() });
	const users = useQuery({
		queryKey: ["studio", "users", search.q, search.page],
		queryFn: () => listAdminUsers({ data: search }),
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
				<SearchField
					label="Cari nama atau e-mel"
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<QueryState query={users} />
				{users.data?.items.length === 0 && <EmptyList />}
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
							{users.data?.items.map((user) => (
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
												const role = user.role?.split(",").includes("admin")
													? "user"
													: "admin";
												if (
													await confirmAction({
														description: `Tukar peranan ${user.email} kepada ${role}? ${role === "admin" ? "Pengguna akan boleh mengurus kandungan, pengguna, akses dan operasi jualan." : "Pengguna akan kehilangan semua hak pentadbiran."}`,
														destructive: role !== "admin",
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
												if (user.banned) {
													if (
														await confirmAction({
															description: `Buka sekatan ${user.email}? Pengguna akan boleh log masuk semula.`,
															destructive: false,
														})
													)
														void perform(() =>
															authClient.admin.unbanUser({ userId: user.id }),
														);
												} else {
													const reason = await confirmAction({
														description: `Sekat ${user.email}? Pengguna tidak boleh log masuk dan sesi aktif akan dibatalkan. Nyatakan sebab menyekat pengguna:`,
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
														description: `Batalkan semua sesi ${user.email}? Pengguna akan dilog keluar pada semua peranti dan perlu log masuk semula.`,
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
				<StudioPagination
					data={users.data}
					onPage={(page) => update({ page })}
				/>
			</section>
		</UiCard>
	);
}
