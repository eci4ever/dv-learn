import { useEffect, useRef, useState } from "react";
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
	reason?: boolean;
	minLength?: number;
	destructive?: boolean;
};

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
					<DialogTitle>Sahkan tindakan</DialogTitle>
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
							Sebab
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
							Batal
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
							Sahkan
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
	return { confirmAction, actionDialog };
}
