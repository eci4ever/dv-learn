import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
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
				<AppLink href="/login">Log masuk untuk mengurus akaun.</AppLink>
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
