import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { learningAuthHref } from "../lib/learning-return";
import * as m from "../paraglide/messages.js";
import type { Viewer } from "../server/contracts";
import { enrollFree } from "../server/functions";
import { AppLink } from "./app-link";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";

export function FreeEnrollment({
	slug,
	viewer,
	returnTo,
}: {
	slug: string;
	viewer: Viewer | null;
	returnTo: string;
}) {
	const client = useQueryClient();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function enroll() {
		setBusy(true);
		setError("");
		try {
			await enrollFree({ data: { slug } });
			await Promise.all([
				client.invalidateQueries({ queryKey: ["course", slug] }),
				client.invalidateQueries({ queryKey: ["lesson", slug] }),
				client.invalidateQueries({ queryKey: ["dashboard"] }),
			]);
		} catch {
			setError(m.enrollment_error());
		} finally {
			setBusy(false);
		}
	}
	return (
		<section
			className="grid min-w-0 gap-3 rounded-xl border bg-muted/50 p-4 [overflow-wrap:anywhere]"
			aria-label={m.save_course_progress()}
		>
			<p className="text-base text-muted-foreground">
				{m.free_progress_hint()}
			</p>
			{viewer?.emailVerified ? (
				<Button
					className="h-auto min-h-11 max-w-full whitespace-normal"
					disabled={busy}
					onClick={enroll}
				>
					{busy ? m.saving() : m.enroll_free()}
				</Button>
			) : (
				<div className="flex flex-wrap gap-3">
					<Button
						className="h-auto min-h-11 max-w-full whitespace-normal"
						role="link"
						nativeButton={false}
						render={
							<AppLink
								href={learningAuthHref(
									viewer ? "verify-email" : "login",
									returnTo,
								)}
							/>
						}
					>
						{viewer ? m.verify_to_save() : m.sign_in_to_save()}
					</Button>
					{!viewer && (
						<Button
							className="h-auto min-h-11 max-w-full whitespace-normal"
							variant="outline"
							role="link"
							nativeButton={false}
							render={<AppLink href={learningAuthHref("register", returnTo)} />}
						>
							{m.create_account()}
						</Button>
					)}
				</div>
			)}
			{error && (
				<Alert variant="destructive" role="alert">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
		</section>
	);
}
