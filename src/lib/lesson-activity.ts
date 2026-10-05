import { z } from "zod";
import { parseIPv4 } from "./ip-address.ts";

const text = z.string().trim().min(1).max(2000);
const id = z
	.string()
	.regex(/^[a-zA-Z0-9_-]+$/)
	.max(80);
const name = z
	.string()
	.trim()
	.min(1)
	.max(254)
	.refine(
		(value) =>
			/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.?$/i.test(value) &&
			value
				.replace(/\.$/, "")
				.split(".")
				.every(
					(label) =>
						label.length > 0 &&
						label.length <= 63 &&
						!label.startsWith("-") &&
						!label.endsWith("-"),
				),
		"Use an ASCII DNS name, not a URL.",
	);
const ipv4 = z
	.string()
	.refine((value) => parseIPv4(value) !== null, "Use an IPv4 address.");
export const recordTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"] as const;
export const resultTypes = ["request", "referral", "answer"] as const;
const unique = (values: { id: string }[]) =>
	new Set(values.map((value) => value.id)).size === values.length;
const base = { version: z.literal(1), title: text };
const choice = z.object({ id, text }).strict();
const question = z
	.object({
		id,
		prompt: text,
		choices: z
			.array(choice)
			.min(2)
			.max(6)
			.refine(unique, "Choice IDs must be unique."),
		answerId: id,
		explanation: text,
		lessonId: id.optional(),
	})
	.strict()
	.refine(
		(q) => q.choices.some((c) => c.id === q.answerId),
		"The answer must be one of the choices.",
	);
const quiz = z
	.object({
		...base,
		kind: z.literal("practice-quiz"),
		questions: z
			.array(question)
			.min(1)
			.max(30)
			.refine(unique, "Question IDs must be unique."),
	})
	.strict();
const step = z
	.object({
		id,
		from: id,
		to: id,
		result: z.enum(resultTypes),
		explanation: text,
	})
	.strict();
const trace = z
	.object({
		...base,
		kind: z.literal("dns-resolution"),
		queryName: name,
		address: ipv4,
		roles: z
			.array(z.object({ id, label: text }).strict())
			.min(2)
			.max(8)
			.refine(unique),
		coldSteps: z.array(step).min(1).max(12).refine(unique),
		warmSteps: z.array(step).min(1).max(12).refine(unique),
	})
	.strict()
	.refine(
		(config) =>
			[...config.coldSteps, ...config.warmSteps].every(
				(s) =>
					config.roles.some((r) => r.id === s.from) &&
					config.roles.some((r) => r.id === s.to),
			),
		"Every step must use defined roles.",
	);
const expectedRecord = z
	.object({
		type: z.enum(recordTypes),
		value: z.string().trim().min(1).max(500),
		preference: z.number().int().min(0).max(65535).optional(),
	})
	.strict()
	.superRefine((record, ctx) => {
		if (record.type === "A" && !parseIPv4(record.value))
			ctx.addIssue({ code: "custom", message: "A requires IPv4." });
		if (record.type === "AAAA" && !normaliseIPv6(record.value))
			ctx.addIssue({ code: "custom", message: "AAAA requires IPv6." });
		if (
			["CNAME", "MX", "NS"].includes(record.type) &&
			!name.safeParse(record.value).success
		)
			ctx.addIssue({
				code: "custom",
				message: "This record requires a DNS name.",
			});
		if (record.type === "MX" && record.preference === undefined)
			ctx.addIssue({ code: "custom", message: "MX requires a preference." });
		if (record.type !== "MX" && record.preference !== undefined)
			ctx.addIssue({ code: "custom", message: "Only MX uses a preference." });
	});
const records = z
	.object({
		...base,
		kind: z.literal("dns-records"),
		tasks: z
			.array(
				z
					.object({
						id,
						prompt: text,
						owner: name,
						expected: expectedRecord,
						hint: text,
						explanation: text,
					})
					.strict(),
			)
			.min(1)
			.max(12)
			.refine(unique),
	})
	.strict()
	.refine(
		(config) =>
			config.tasks.every(
				(task) =>
					task.expected.type !== "CNAME" ||
					!config.tasks.some(
						(other) =>
							other !== task &&
							normaliseName(other.owner) === normaliseName(task.owner),
					),
			),
		"A CNAME owner cannot have other exercise records.",
	);
const cache = z
	.object({
		...base,
		kind: z.literal("dns-cache"),
		queryName: name,
		initialAddress: ipv4,
		updatedAddress: ipv4,
		ttlSeconds: z.number().int().min(0).max(86400),
		changeAt: z.number().int().min(0).max(86400),
		queryTimes: z.array(z.number().int().min(0).max(86400)).min(1).max(12),
	})
	.strict()
	.refine(
		(config) =>
			config.queryTimes.every(
				(t, i) => i === 0 || t > config.queryTimes[i - 1],
			),
		"Query times must increase.",
	);
export const activitySchema = z.discriminatedUnion("kind", [
	quiz,
	trace,
	records,
	cache,
]);
export type ActivityConfig = z.infer<typeof activitySchema>;
export type QuizConfig = Extract<ActivityConfig, { kind: "practice-quiz" }>;
export type TraceConfig = Extract<ActivityConfig, { kind: "dns-resolution" }>;
export type RecordsConfig = Extract<ActivityConfig, { kind: "dns-records" }>;
export type CacheConfig = Extract<ActivityConfig, { kind: "dns-cache" }>;

export function parseActivity(value?: string | null): ActivityConfig | null {
	if (!value || value.length > 64000) return null;
	try {
		const parsed = activitySchema.safeParse(JSON.parse(value));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
export function activityIssues(value: {
	lessonType: string;
	activity?: string | null;
	activityConfig?: string | null;
}): string[] {
	if (!value.activityConfig) return [];
	const config = parseActivity(value.activityConfig);
	if (!config)
		return ["Add valid version 1 activity JSON with complete exercise data."];
	if (value.activity)
		return [
			"Choose either a legacy activity or configured practice, not both.",
		];
	if (
		value.lessonType !==
		(config.kind === "practice-quiz" ? "quiz" : "interactive")
	)
		return ["The activity configuration does not match the lesson type."];
	return [];
}
export function normaliseName(value: string) {
	return value.trim().toLowerCase().replace(/\.$/, "");
}
function normaliseIPv6(value: string): string | null {
	if (!value.includes(":") || !/^[a-f0-9:.]+$/i.test(value)) return null;
	try {
		return new URL(`http://[${value}]/`).hostname.toLowerCase();
	} catch {
		return null;
	}
}
export function recordFeedback(
	task: RecordsConfig["tasks"][number],
	input: { owner: string; type: string; value: string; preference: string },
): string[] {
	const errors: string[] = [];
	const expected = task.expected;
	if (normaliseName(input.owner) !== normaliseName(task.owner))
		errors.push(`Use the owner name ${task.owner}.`);
	if (input.type !== expected.type)
		errors.push(`Choose the record type that fits the job. ${task.hint}`);
	let matches: boolean;
	if (expected.type === "AAAA")
		matches =
			Boolean(normaliseIPv6(input.value)) &&
			normaliseIPv6(input.value) === normaliseIPv6(expected.value);
	else if (expected.type === "A")
		matches =
			Boolean(parseIPv4(input.value)) &&
			input.value.trim() === expected.value.trim();
	else if (["CNAME", "MX", "NS"].includes(expected.type))
		matches =
			name.safeParse(input.value).success &&
			normaliseName(input.value) === normaliseName(expected.value);
	else matches = input.value.trim() === expected.value.trim();
	if (!matches)
		errors.push(
			["CNAME", "MX", "NS"].includes(expected.type)
				? "Use the supplied DNS name, not a URL or IP address."
				: expected.type === "TXT"
					? "Copy the supplied text exactly; text is case-sensitive."
					: `Check the supplied value: use the ${expected.type === "A" ? "IPv4" : "IPv6"} address from the prompt.`,
		);
	if (
		expected.type === "MX" &&
		(!/^\d+$/.test(input.preference.trim()) ||
			Number(input.preference) !== expected.preference)
	)
		errors.push(`Use mail preference ${expected.preference}.`);
	return errors;
}
export function quizResults(
	config: QuizConfig,
	answers: Record<string, string>,
) {
	return config.questions.map((q) => ({
		id: q.id,
		correct: answers[q.id] === q.answerId,
		explanation: q.explanation,
	}));
}
export function cacheRun(config: CacheConfig) {
	let address = config.initialAddress;
	let storedAt = 0;
	return config.queryTimes.map((time) => {
		const refreshed = time - storedAt >= config.ttlSeconds;
		if (refreshed) {
			address =
				time >= config.changeAt ? config.updatedAddress : config.initialAddress;
			storedAt = time;
		}
		return {
			time,
			address,
			ttl: Math.max(0, config.ttlSeconds - (time - storedAt)),
			refreshed,
			authoritative:
				time >= config.changeAt ? config.updatedAddress : config.initialAddress,
		};
	});
}
