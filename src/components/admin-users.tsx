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
			setMessage("User updated.");
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Unable to complete the action.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<UiCard className="gap-0 p-6">
			<section className="operations">
				{actionDialog}
				<h2>Users and roles</h2>
				<p>
					Manage users with Better Auth Admin. Course access is managed
					separately.
				</p>
				{(message || users.error) && (
					<Alert role="status">
						<AlertDescription>
							{message || users.error?.message}
						</AlertDescription>
					</Alert>
				)}
				<SearchField
					label="Search name or email"
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<QueryState query={users} />
				{users.data?.items.length === 0 && <EmptyList />}
				<div className="table-wrap">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Users</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Actions</TableHead>
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
											{user.banned ? "Banned" : "Active"}
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
														description: `Change the role of ${user.email} to ${role}? ${role === "admin" ? "This user will be able to manage content, users, access and sales." : "This user will lose all admin permissions."}`,
														destructive: role !== "admin",
													})
												)
													void perform(() =>
														authClient.admin.setRole({ userId: user.id, role }),
													);
											}}
										>
											Change role
										</Button>{" "}
										<Button
											type="button"
											disabled={busy || user.id === viewer.data?.id}
											onClick={async () => {
												if (user.banned) {
													if (
														await confirmAction({
															description: `Unban ${user.email}? This user will be able to sign in again.`,
															destructive: false,
														})
													)
														void perform(() =>
															authClient.admin.unbanUser({ userId: user.id }),
														);
												} else {
													const reason = await confirmAction({
														description: `Ban ${user.email}? This user will not be able to sign in and active sessions will end. Enter a reason:`,
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
											{user.banned ? "Unban" : "Ban"}
										</Button>{" "}
										<Button
											type="button"
											disabled={busy}
											onClick={async () => {
												if (
													await confirmAction({
														description: `End all sessions for ${user.email}? This user will be signed out on all devices and will need to sign in again.`,
													})
												)
													void perform(() =>
														authClient.admin.revokeUserSessions({
															userId: user.id,
														}),
													);
											}}
										>
											End sessions
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
