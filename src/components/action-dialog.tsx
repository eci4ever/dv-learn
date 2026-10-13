import { useEffect, useRef, useState } from "react";
import * as m from "../paraglide/messages.js";
import { studioDisplayMessage } from "./studio/common";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type Request = {
	description: string;
	confirmLabel?: string;
	reason?: boolean;
	minLength?: number;
	destructive?: boolean;
};

// Keep known operator guidance without exposing untranslated provider errors.
export function operationErrorMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : "";
	switch (message) {
		case "Please sign in to continue.":
			return m.ops_sign_in_required();
		case "Please verify your email to continue.":
			return m.ops_verify_email_required();
		case "Administrator permission is required.":
			return m.ops_admin_required();
		case "A verified user is required.":
			return m.ops_verified_user_required();
		case "Paid order required.":
			return m.ops_paid_order_required();
		case "Order not found.":
			return m.ops_order_not_found();
		case "Unable to check payment status. Please try again.":
			return m.ops_payment_check_failed();
		default:
			return studioDisplayMessage(message, m.ops_action_failed());
	}
}

// Await a deliberate user decision; dismissing never executes the mutation.
export function useActionDialog() {
	const [request, setRequest] = useState<Request | null>(null);
	const [reason, setReason] = useState("");
	const resolve = useRef<((value: string | null) => void) | null>(null);
	useEffect(
		() => () => {
			resolve.current?.(null);
		},
		[],
	);
	function finish(value: string | null) {
		resolve.current?.(value);
		resolve.current = null;
		setRequest(null);
	}
	function confirmAction(next: Request) {
		resolve.current?.(null);
		setReason("");
		setRequest(next);
		return new Promise<string | null>((done) => {
			resolve.current = done;
		});
	}
	const actionDialog = (
		<Dialog
			open={request !== null}
			onOpenChange={(open) => {
				if (!open) finish(null);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{m.ops_confirm_action()}</DialogTitle>
					<DialogDescription>{request?.description}</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						finish(request?.reason ? reason.trim() : "confirmed");
					}}
				>
					{request?.reason && (
						<Label className="flex-col items-stretch">
							{m.ops_reason()}
							<Textarea
								autoFocus
								required
								minLength={request.minLength ?? 1}
								value={reason}
								onChange={(event) => setReason(event.target.value)}
							/>
						</Label>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => finish(null)}
						>
							{m.ops_cancel()}
						</Button>
						<Button
							type="submit"
							variant={
								request?.destructive === false ? "default" : "destructive"
							}
							disabled={
								request?.reason &&
								reason.trim().length < (request.minLength ?? 1)
							}
						>
							{request?.confirmLabel ?? m.ops_confirm()}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
	return { confirmAction, actionDialog };
}
