import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import * as m from "../paraglide/messages.js";
import * as api from "../server/functions";
import { AppLink } from "./app-link";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card as UiCard } from "./ui/card";
import { Empty } from "./ui/empty";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
			if (result.error) {
				const code = result.error.code;
				setMessage(
					code === "INVALID_PASSWORD" || code === "INVALID_CURRENT_PASSWORD"
						? m.learner_invalid_current_password()
						: code === "PASSWORD_TOO_SHORT"
							? m.learner_password_short()
							: code === "PASSWORD_TOO_LONG"
								? m.learner_password_long()
								: m.learner_unable_to_save_changes(),
				);
				return;
			}
			setMessage(m.learner_changes_saved());
			await viewer.refetch();
		} catch {
			setMessage(m.learner_unable_to_save_changes());
		} finally {
			setBusy(false);
		}
	}
	if (viewer.isPending)
		return (
			<Empty className="empty" role="status">
				{m.learner_loading_account()}
			</Empty>
		);
	if (viewer.isError)
		return (
			<Empty className="empty error">
				<h1>{m.learner_account_settings()}</h1>
				<p>{m.learner_account_load_failed()}</p>
				<Button onClick={() => void viewer.refetch()}>{m.try_again()}</Button>
			</Empty>
		);
	if (!viewer.data)
		return (
			<Empty className="empty error">
				<h1>{m.learner_account_settings()}</h1>
				<AppLink href="/login">
					{m.learner_sign_in_to_manage_your_account()}
				</AppLink>
			</Empty>
		);
	return (
		<section className="section">
			<h1 className="page-title">{m.learner_account_settings()}</h1>
			<p>{viewer.data.email}</p>
			<div className="admin-grid">
				<UiCard className="gap-0 p-6">
					<form className="admin-form" onSubmit={(event) => void submit(event)}>
						<h2>{m.learner_profile()}</h2>
						<Label className="flex-col items-stretch">
							{m.learner_name()}
							<Input
								name="name"
								required
								maxLength={200}
								defaultValue={viewer.data.name}
							/>
						</Label>
						<Button type="submit" className="button" disabled={busy}>
							{busy ? m.learner_please_wait() : m.learner_save_profile()}
						</Button>
					</form>
				</UiCard>
				<UiCard className="gap-0 p-6">
					<form
						className="admin-form"
						onSubmit={(event) => void submit(event, true)}
					>
						<h2>{m.learner_password()}</h2>
						<p>{m.learner_password_sessions()}</p>
						<Label className="flex-col items-stretch">
							{m.learner_current_password()}
							<Input
								type="password"
								name="currentPassword"
								autoComplete="current-password"
								required
							/>
						</Label>
						<Label className="flex-col items-stretch">
							{m.learner_new_password()}
							<Input
								type="password"
								name="newPassword"
								autoComplete="new-password"
								minLength={10}
								required
							/>
						</Label>
						<Button type="submit" className="button" disabled={busy}>
							{busy ? m.learner_please_wait() : m.learner_change_password()}
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
