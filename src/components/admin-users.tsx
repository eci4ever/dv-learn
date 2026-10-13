import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import * as m from "../paraglide/messages.js";
import { getViewer } from "../server/functions";
import { listAdminUsers } from "../server/studio";
import { operationErrorMessage, useActionDialog } from "./action-dialog";
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
			setMessage(m.ops_user_updated());
		} catch (error) {
			setMessage(operationErrorMessage(error));
		} finally {
			setBusy(false);
		}
	}
	return (
		<UiCard className="gap-0 p-6">
			<section className="operations">
				{actionDialog}
				<h2>{m.ops_users_roles()}</h2>
				<p>{m.ops_users_help()}</p>
				{(message || users.error) && (
					<Alert role="status">
						<AlertDescription>
							{message || operationErrorMessage(users.error)}
						</AlertDescription>
					</Alert>
				)}
				<SearchField
					label={m.ops_search_users()}
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<QueryState query={users} />
				{users.data?.items.length === 0 && (
					<EmptyList>{m.ops_empty()}</EmptyList>
				)}
				<div className="table-wrap">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{m.ops_users()}</TableHead>
								<TableHead>{m.ops_role()}</TableHead>
								<TableHead>{m.ops_status()}</TableHead>
								<TableHead>{m.ops_actions()}</TableHead>
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
										<Badge variant="outline">
											{user.role
												?.split(",")
												.map((role) =>
													role === "admin"
														? m.ops_administrator()
														: role === "user"
															? m.ops_user()
															: role,
												)
												.join(", ")}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant={user.banned ? "destructive" : "secondary"}>
											{user.banned ? m.ops_banned() : m.ops_active()}
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
														description:
															role === "admin"
																? m.ops_promote_confirmation({
																		email: user.email,
																	})
																: m.ops_demote_confirmation({
																		email: user.email,
																	}),
														confirmLabel: m.ops_change_role(),
														destructive: role !== "admin",
													})
												)
													void perform(() =>
														authClient.admin.setRole({ userId: user.id, role }),
													);
											}}
										>
											{m.ops_change_role()}
										</Button>{" "}
										<Button
											type="button"
											disabled={busy || user.id === viewer.data?.id}
											onClick={async () => {
												if (user.banned) {
													if (
														await confirmAction({
															description: m.ops_unban_confirmation({
																email: user.email,
															}),
															confirmLabel: m.ops_unban(),
															destructive: false,
														})
													)
														void perform(() =>
															authClient.admin.unbanUser({ userId: user.id }),
														);
												} else {
													const reason = await confirmAction({
														description: m.ops_ban_confirmation({
															email: user.email,
														}),
														confirmLabel: m.ops_ban(),
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
											{user.banned ? m.ops_unban() : m.ops_ban()}
										</Button>{" "}
										<Button
											type="button"
											disabled={busy}
											onClick={async () => {
												if (
													await confirmAction({
														description: m.ops_sessions_confirmation({
															email: user.email,
														}),
														confirmLabel: m.ops_end_sessions(),
													})
												)
													void perform(() =>
														authClient.admin.revokeUserSessions({
															userId: user.id,
														}),
													);
											}}
										>
											{m.ops_end_sessions()}
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
