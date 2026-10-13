import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as m from "../../paraglide/messages.js";
import { grantAccess, revokeManualAccess } from "../../server/functions";
import * as api from "../../server/studio";
import { operationErrorMessage, useActionDialog } from "../action-dialog";
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
			setMessage(m.ops_access_updated());
		} catch (e) {
			setMessage(operationErrorMessage(e));
		} finally {
			setBusy(false);
		}
	}
	return (
		<section className="grid gap-5">
			{actionDialog}
			<div className="flex flex-wrap justify-between gap-3">
				<h2>{m.ops_course_access()}</h2>
				<Button onClick={() => setGrantOpen(!grantOpen)}>
					{grantOpen ? m.ops_close_form() : m.ops_grant_manual()}
				</Button>
			</div>
			<p className="text-muted-foreground">{m.ops_access_help()}</p>
			{message && <p role="status">{message}</p>}
			{grantOpen && (
				<form
					className="studio-form"
					onSubmit={async (e) => {
						e.preventDefault();
						if (
							await confirmAction({
								description: m.ops_grant_confirmation(),
								confirmLabel: m.ops_grant_access(),
							})
						)
							await perform(() => grantAccess({ data: { userId, courseId } }));
					}}
				>
					<ParentPicker
						kind="users"
						label={m.ops_users()}
						value={userId ? [userId] : []}
						onChange={(ids) => setUserId(ids[0])}
					/>
					<ParentPicker
						kind="courses"
						label={m.ops_courses()}
						value={courseId ? [courseId] : []}
						onChange={(ids) => setCourseId(ids[0])}
					/>
					<Button type="submit" disabled={busy || !userId || !courseId}>
						{m.ops_grant_access()}
					</Button>
				</form>
			)}
			<div className="flex flex-wrap gap-3 items-end">
				<SearchField
					label={m.ops_search_access()}
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label={m.ops_source()}
					value={search.source}
					onChange={(source) =>
						update({ source: api.studioSearch.shape.source.parse(source) })
					}
					options={[
						["all", m.ops_all()],
						["manual", m.ops_manual()],
						["order", m.ops_orders()],
					]}
				/>
				<Filter
					label={m.ops_status()}
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", m.ops_all()],
						["active", m.ops_active()],
						["revoked", m.ops_revoked()],
					]}
				/>
			</div>
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList>{m.ops_empty()}</EmptyList>}
			<ul className="grid gap-3">
				{query.data?.items.map((a) => (
					<li key={a.id} className="studio-row">
						<div className="min-w-0">
							<p className="break-words font-medium">{a.email}</p>
							<p className="break-words">{a.courseTitle}</p>
							<p className="text-sm text-muted-foreground">
								{a.source === "manual" ? m.ops_manual() : m.ops_orders()} ·{" "}
								{a.revokedAt ? m.ops_revoked() : m.ops_active()}
							</p>
						</div>
						{a.source === "manual" && !a.revokedAt && (
							<Button
								variant="outline"
								disabled={busy}
								onClick={async () => {
									if (
										await confirmAction({
											description: m.ops_revoke_confirmation({
												email: a.email,
												course: a.courseTitle,
											}),
											confirmLabel: m.ops_revoke_manual(),
										})
									)
										await perform(() =>
											revokeManualAccess({
												data: { userId: a.userId, courseId: a.courseId },
											}),
										);
								}}
							>
								{m.ops_revoke_manual()}
							</Button>
						)}
					</li>
				))}
			</ul>
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</section>
	);
}
