import { z } from "zod";

const id = z
	.string()
	.regex(/^[a-zA-Z0-9_-]+$/)
	.max(80);
const text = z.string().trim().min(1).max(2000);
const base = { version: z.literal(1), title: text };
const unique = (items: { id: string }[]) =>
	new Set(items.map((item) => item.id)).size === items.length;
const task = { id, prompt: text, hint: text, explanation: text };

export const textSelectSchema = z
	.object({
		...base,
		kind: z.literal("text-select"),
		tasks: z
			.array(
				z
					.object({
						...task,
						segments: z
							.array(z.object({ id, text }).strict())
							.min(2)
							.max(20)
							.refine(unique),
						answerIds: z
							.array(id)
							.min(1)
							.max(20)
							.refine((ids) => new Set(ids).size === ids.length),
					})
					.strict()
					.refine(
						(t) =>
							t.answerIds.every((answer) =>
								t.segments.some((s) => s.id === answer),
							),
						"Answer IDs must identify existing segments.",
					),
			)
			.min(1)
			.max(12)
			.refine(unique),
	})
	.strict();

export const errorSpotSchema = z
	.object({
		...base,
		kind: z.literal("error-spot"),
		tasks: z
			.array(
				z
					.object({
						...task,
						fields: z
							.array(z.object({ id, label: text, value: text }).strict())
							.min(2)
							.max(10)
							.refine(unique),
						errorFieldId: id,
						acceptedValues: z
							.array(z.string().trim().min(1).max(500))
							.min(1)
							.max(10),
						caseSensitive: z.boolean(),
					})
					.strict()
					.refine(
						(t) => t.fields.some((f) => f.id === t.errorFieldId),
						"The error field must exist.",
					),
			)
			.min(1)
			.max(12)
			.refine(unique),
	})
	.strict();

const decision = z
	.object({
		id,
		type: z.literal("decision"),
		title: text,
		text,
		hint: text,
		choices: z
			.array(z.object({ id, text, nextId: id, explanation: text }).strict())
			.min(2)
			.max(6)
			.refine(unique),
	})
	.strict();
const outcome = z
	.object({
		id,
		type: z.literal("outcome"),
		title: text,
		text,
		outcome: z.enum(["success", "retry"]),
	})
	.strict();

export const branchingSchema = z
	.object({
		...base,
		kind: z.literal("branching-scenario"),
		startId: id,
		nodes: z
			.array(z.discriminatedUnion("type", [decision, outcome]))
			.min(3)
			.max(20)
			.refine(unique),
	})
	.strict()
	.superRefine((config, ctx) => {
		const nodes = new Map(config.nodes.map((node) => [node.id, node]));
		const fail = (message: string) =>
			ctx.addIssue({ code: "custom", message, path: ["nodes"] });
		if (nodes.get(config.startId)?.type !== "decision")
			fail("Start with an existing decision node.");
		if (
			config.nodes.some(
				(node) =>
					node.type === "decision" &&
					node.choices.some((choice) => !nodes.has(choice.nextId)),
			)
		)
			fail("Every choice must target an existing node.");
		const visited = new Set<string>();
		const active = new Set<string>();
		let cycle = false;
		function visit(key: string) {
			if (active.has(key)) {
				cycle = true;
				return;
			}
			if (visited.has(key)) return;
			const node = nodes.get(key);
			if (!node) return;
			visited.add(key);
			active.add(key);
			if (node.type === "decision")
				for (const choice of node.choices) visit(choice.nextId);
			active.delete(key);
		}
		visit(config.startId);
		if (cycle) fail("Scenario paths must end, not loop.");
		if (visited.size !== config.nodes.length)
			fail("Every node must be reachable from the start.");
		if (
			!config.nodes.some(
				(node) =>
					node.type === "outcome" &&
					node.outcome === "success" &&
					visited.has(node.id),
			)
		)
			fail("Include a reachable successful outcome.");
	});

export type TextSelectConfig = z.infer<typeof textSelectSchema>;
export type ErrorSpotConfig = z.infer<typeof errorSpotSchema>;
export type BranchingConfig = z.infer<typeof branchingSchema>;
export type GenericActivityConfig =
	| TextSelectConfig
	| ErrorSpotConfig
	| BranchingConfig;

export function selectionCorrect(
	task: TextSelectConfig["tasks"][number],
	selected: readonly string[],
) {
	return (
		selected.length === task.answerIds.length &&
		new Set(selected).size === selected.length &&
		selected.every((id) => task.answerIds.includes(id))
	);
}

export function correctionResult(
	task: ErrorSpotConfig["tasks"][number],
	fieldId: string,
	value: string,
) {
	const normalize = (value: string) =>
		task.caseSensitive ? value.trim() : value.trim().toLowerCase();
	const fieldCorrect = fieldId === task.errorFieldId;
	const valueCorrect = task.acceptedValues.some(
		(answer) => normalize(answer) === normalize(value),
	);
	return { fieldCorrect, valueCorrect, correct: fieldCorrect && valueCorrect };
}

export function scenarioNext(
	config: BranchingConfig,
	nodeId: string,
	choiceId: string,
) {
	const node = config.nodes.find((node) => node.id === nodeId);
	return node?.type === "decision"
		? (node.choices.find((choice) => choice.id === choiceId)?.nextId ?? null)
		: null;
}
