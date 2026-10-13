import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
	return (
		<Loader2Icon
			data-slot="spinner"
			role="status"
			aria-label={m.loading()}
			className={cn("size-4 animate-spin", className)}
			{...props}
		/>
	);
}

export { Spinner };
