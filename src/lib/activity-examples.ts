import type { ActivityConfig } from "./lesson-activity";

/** Editable starter data, not a course-specific branch in the renderer. */
export function activityExample(kind: ActivityConfig["kind"]): ActivityConfig {
	const base = { version: 1 as const, title: "Practice" };
	switch (kind) {
		case "text-select":
			return {
				...base,
				kind,
				title: "Find the hostname",
				tasks: [
					{
						id: "url1",
						prompt: "Select only the hostname in this URL.",
						segments: [
							{ id: "scheme", text: "https://" },
							{ id: "host", text: "learn.example.com" },
							{ id: "path", text: "/start" },
						],
						answerIds: ["host"],
						hint: "The hostname is after the scheme and before the path.",
						explanation:
							"learn.example.com is the hostname. The scheme and path are not part of it.",
					},
				],
			};
		case "error-spot":
			return {
				...base,
				kind,
				title: "Fix the record",
				tasks: [
					{
						id: "alias1",
						prompt:
							"This CNAME should point to app.example.com. Select the incorrect field and enter a corrected value.",
						fields: [
							{ id: "type", label: "Record type", value: "CNAME" },
							{
								id: "value",
								label: "Record value",
								value: "https://app.example.com/start",
							},
						],
						errorFieldId: "value",
						acceptedValues: ["app.example.com", "app.example.com."],
						caseSensitive: false,
						hint: "An alias points to a name, not to a web page.",
						explanation:
							"The type is already CNAME. Replace the URL with the target hostname.",
					},
				],
			};
		case "branching-scenario":
			return {
				...base,
				kind,
				title: "Investigate a lookup",
				startId: "start",
				nodes: [
					{
						id: "start",
						type: "decision",
						title: "Website unavailable",
						text: "A fictional website will not open. You have not inspected the lookup yet. What should you do first?",
						hint: "Collect evidence before changing configuration.",
						choices: [
							{
								id: "inspect",
								text: "Inspect the lookup result",
								nextId: "evidence",
								explanation:
									"The simulated reply is NXDOMAIN. It reports that the queried name does not exist.",
							},
							{
								id: "change",
								text: "Immediately change the A record",
								nextId: "retry",
								explanation:
									"You have no evidence that the A record is the cause.",
							},
						],
					},
					{
						id: "evidence",
						type: "decision",
						title: "Review the evidence",
						text: "You queried ap.example.com, but the supplied correct hostname is app.example.com. What should you try next?",
						hint: "Compare the queried name with the supplied hostname.",
						choices: [
							{
								id: "name",
								text: "Retry using app.example.com",
								nextId: "success",
								explanation:
									"The spelling differs. The corrected name returns the supplied fictional address.",
							},
							{
								id: "ttl",
								text: "Change the TTL",
								nextId: "retry",
								explanation:
									"Changing TTL does not correct the queried spelling.",
							},
						],
					},
					{
						id: "success",
						type: "outcome",
						title: "Evidence-led diagnosis",
						text: "You inspected the reply and corrected the queried hostname without making an unsupported DNS change.",
						outcome: "success",
					},
					{
						id: "retry",
						type: "outcome",
						title: "Try another approach",
						text: "Start again and choose a next step justified by the supplied evidence.",
						outcome: "retry",
					},
				],
			};
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
