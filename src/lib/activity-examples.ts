import type { ActivityConfig } from "./lesson-activity";

/** Editable starter data, not a course-specific branch in the renderer. */
export function activityExample(kind: ActivityConfig["kind"]): ActivityConfig {
	const base = { version: 1 as const, title: "Practice" };
	switch (kind) {
		case "practice-quiz":
			return {
				...base,
				kind,
				title: "Practice quiz",
				questions: [
					{
						id: "q1",
						prompt: "Which record stores an IPv4 address?",
						choices: [
							{ id: "a", text: "A" },
							{ id: "b", text: "AAAA" },
						],
						answerId: "a",
						explanation: "A stores IPv4; AAAA stores IPv6.",
					},
				],
			};
		case "dns-records":
			return {
				...base,
				kind,
				title: "DNS record practice",
				tasks: [
					{
						id: "record1",
						prompt: "Give app.example.com the IPv4 address 192.0.2.10.",
						owner: "app.example.com",
						expected: { type: "A", value: "192.0.2.10" },
						hint: "Choose an IPv4 address record.",
						explanation: "A stores an IPv4 address.",
					},
				],
			};
		case "dns-cache":
			return {
				...base,
				kind,
				title: "DNS cache timeline",
				queryName: "app.example.com",
				initialAddress: "192.0.2.10",
				updatedAddress: "192.0.2.20",
				ttlSeconds: 300,
				changeAt: 120,
				queryTimes: [120, 299, 300, 301],
			};
		case "dns-resolution":
			return {
				...base,
				kind,
				title: "DNS lookup walkthrough",
				queryName: "app.example.com",
				address: "192.0.2.10",
				roles: [
					{ id: "device", label: "Device" },
					{ id: "resolver", label: "Resolver" },
				],
				coldSteps: [
					{
						id: "request",
						from: "device",
						to: "resolver",
						result: "request",
						explanation:
							"The device asks the resolver; extend this example with referral steps.",
					},
					{
						id: "return",
						from: "resolver",
						to: "device",
						result: "answer",
						explanation: "The resolver returns the answer.",
					},
				],
				warmSteps: [
					{
						id: "request",
						from: "device",
						to: "resolver",
						result: "request",
						explanation: "The device asks for an answer.",
					},
					{
						id: "return",
						from: "resolver",
						to: "device",
						result: "answer",
						explanation: "The resolver uses its valid cached answer.",
					},
				],
			};
	}
}
