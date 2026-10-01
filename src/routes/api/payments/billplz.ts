import { createFileRoute } from "@tanstack/react-router";
import { billplzCallback } from "../../../server/payments";
export const Route = createFileRoute("/api/payments/billplz")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					return await billplzCallback(request);
				} catch {
					return new Response("Payment processing unavailable; please retry", {
						status: 503,
					});
				}
			},
		},
	},
});
