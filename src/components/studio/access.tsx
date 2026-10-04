import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { grantAccess, revokeManualAccess } from "../../server/functions";
import * as api from "../../server/studio";
import { useActionDialog } from "../action-dialog";
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
			setMessage("Access updated.");
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
	return (
		<section className="grid gap-5">
			{actionDialog}
			<div className="flex flex-wrap justify-between gap-3">
				<h2>Course access</h2>
				<Button onClick={() => setGrantOpen(!grantOpen)}>
					{grantOpen ? "Close form" : "Grant manual access"}
				</Button>
			</div>
			<p className="text-muted-foreground">
				Manual access is separate from purchase access. Revoking manual access
				does not cancel a purchase.
			</p>
			{message && <p role="status">{message}</p>}
			{grantOpen && (
				<form
					className="studio-form"
					onSubmit={async (e) => {
						e.preventDefault();
						if (
							await confirmAction({
								description:
									"Grant manual access to the selected course? This user will be able to open all published content in the course.",
							})
						)
							await perform(() => grantAccess({ data: { userId, courseId } }));
					}}
				>
					<ParentPicker
						kind="users"
						label="Users"
						value={userId ? [userId] : []}
						onChange={(ids) => setUserId(ids[0])}
					/>
					<ParentPicker
						kind="courses"
						label="Courses"
						value={courseId ? [courseId] : []}
						onChange={(ids) => setCourseId(ids[0])}
					/>
					<Button type="submit" disabled={busy || !userId || !courseId}>
						Grant access
					</Button>
				</form>
			)}
			<div className="flex flex-wrap gap-3 items-end">
				<SearchField
					label="Search name, email or course"
					value={search.q}
					onChange={(q) => update({ q })}
				/>
				<Filter
					label="Source"
					value={search.source}
					onChange={(source) =>
						update({ source: api.studioSearch.shape.source.parse(source) })
					}
					options={[
						["all", "All"],
						["manual", "Manual"],
						["order", "Orders"],
					]}
				/>
				<Filter
					label="Status"
					value={search.status}
					onChange={(status) =>
						update({ status: api.studioSearch.shape.status.parse(status) })
					}
					options={[
						["all", "All"],
						["active", "Active"],
						["revoked", "Revoked"],
					]}
				/>
			</div>
			<QueryState query={query} />
			{query.data?.items.length === 0 && <EmptyList />}
			<ul className="grid gap-3">
				{query.data?.items.map((a) => (
					<li key={a.id} className="studio-row">
						<div className="min-w-0">
							<p className="break-words font-medium">{a.email}</p>
							<p className="break-words">{a.courseTitle}</p>
							<p className="text-sm text-muted-foreground">
								{a.source} · {a.revokedAt ? "Revoked" : "Active"}
							</p>
						</div>
						{a.source === "manual" && !a.revokedAt && (
							<Button
								variant="outline"
								disabled={busy}
								onClick={async () => {
									if (
										await confirmAction({
											description: `Revoke manual access for ${a.email} to ${a.courseTitle}? Purchase access and saved progress will be kept.`,
										})
									)
										await perform(() =>
											revokeManualAccess({
												data: { userId: a.userId, courseId: a.courseId },
											}),
										);
								}}
							>
								Revoke manual access
							</Button>
						)}
					</li>
				))}
			</ul>
			<Pagination data={query.data} onPage={(page) => update({ page })} />
		</section>
	);
}
