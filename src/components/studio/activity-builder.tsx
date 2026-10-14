import { useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import { activityExample } from "../../lib/activity-examples";
import type {
	BranchingConfig,
	ErrorSpotConfig,
	GenericActivityConfig,
	TextSelectConfig,
} from "../../lib/generic-activity";
import { parseActivity } from "../../lib/lesson-activity";
import * as m from "../../paraglide/messages.js";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { NativeSelect, NativeSelectOption } from "../ui/native-select";
import { Textarea } from "../ui/textarea";

function Toggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	const id = useId();
	return (
		<Label htmlFor={id} className="min-h-11 gap-3">
			<Checkbox id={id} checked={checked} onCheckedChange={onChange} />
			{label}
		</Label>
	);
}

const kindSchema = z.object({
	kind: z.enum(["text-select", "error-spot", "branching-scenario"]),
});
export function builderKind(json?: string | null) {
	try {
		const result = kindSchema.safeParse(JSON.parse(json ?? ""));
		return result.success ? result.data.kind : null;
	} catch {
		return null;
	}
}
function initialDraft(kind: GenericActivityConfig["kind"], json: string) {
	const value = parseActivity(json);
	if (value && value.kind === kind) return value;
	const starter = activityExample(kind);
	if (
		starter.kind === "text-select" ||
		starter.kind === "error-spot" ||
		starter.kind === "branching-scenario"
	)
		return starter;
	throw Error("Unsupported activity builder.");
}
function nextId(prefix: string, used: readonly { id: string }[]) {
	let n = 1;
	while (used.some((item) => item.id === `${prefix}${n}`)) n++;
	return `${prefix}${n}`;
}
function TextField({
	label,
	value,
	onChange,
	multiline = false,
	maxLength = 2000,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	multiline?: boolean;
	maxLength?: number;
}) {
	const id = useId();
	return (
		<div className="grid gap-2 min-w-0">
			<Label htmlFor={id}>{label}</Label>
			{multiline ? (
				<Textarea
					id={id}
					value={value}
					maxLength={maxLength}
					onChange={(event) => onChange(event.target.value)}
				/>
			) : (
				<Input
					id={id}
					value={value}
					maxLength={maxLength}
					onChange={(event) => onChange(event.target.value)}
				/>
			)}
		</div>
	);
}
function Meta({
	task,
	update,
}: {
	task: Pick<
		TextSelectConfig["tasks"][number],
		"prompt" | "hint" | "explanation"
	>;
	update: (key: "prompt" | "hint" | "explanation", value: string) => void;
}) {
	return (
		<>
			<TextField
				label={m.activity_prompt()}
				value={task.prompt}
				onChange={(value) => update("prompt", value)}
				multiline
			/>
			<TextField
				label={m.activity_hint_text()}
				value={task.hint}
				onChange={(value) => update("hint", value)}
			/>
			<TextField
				label={m.activity_explanation()}
				value={task.explanation}
				onChange={(value) => update("explanation", value)}
				multiline
			/>
		</>
	);
}
function Remove({
	onClick,
	disabled = false,
}: {
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<Button
			type="button"
			variant="outline"
			disabled={disabled}
			className="justify-self-start"
			onClick={onClick}
		>
			{m.activity_remove()}
		</Button>
	);
}

/** Draft state may be incomplete while typing; the normal save validator remains authoritative. */
export function ActivityBuilder({
	kind,
	value,
	onChange,
}: {
	kind: GenericActivityConfig["kind"];
	value: string;
	onChange: (value: string) => void;
}) {
	const [draft, setDraft] = useState(() => initialDraft(kind, value));
	const [externalInvalid, setExternalInvalid] = useState(
		() => !parseActivity(value),
	);
	const emitted = useRef<string | null>(null);
	useEffect(() => {
		if (value === emitted.current) {
			setExternalInvalid(false);
			return;
		}
		const parsed = parseActivity(value);
		setExternalInvalid(parsed?.kind !== kind);
		if (parsed?.kind === kind) setDraft(parsed);
	}, [value, kind]);
	function update(next: GenericActivityConfig) {
		setDraft(next);
		const json = JSON.stringify(next, null, 2);
		emitted.current = json;
		onChange(json);
	}
	if (externalInvalid)
		return (
			<Alert>
				<AlertDescription>{m.studio_fix_json()}</AlertDescription>
			</Alert>
		);
	return (
		<Card className="min-w-0">
			<CardHeader>
				<h3 className="text-xl font-semibold">{m.activity_builder()}</h3>
				<p className="text-muted-foreground">{m.activity_builder_help()}</p>
			</CardHeader>
			<CardContent className="gap-6">
				<TextField
					label={m.activity_title()}
					value={draft.title}
					onChange={(title) => update({ ...draft, title })}
				/>
				{draft.kind === "text-select" ? (
					<TextTasks config={draft} update={update} />
				) : draft.kind === "error-spot" ? (
					<ErrorTasks config={draft} update={update} />
				) : (
					<Scenario config={draft} update={update} />
				)}
			</CardContent>
		</Card>
	);
}
function TextTasks({
	config,
	update,
}: {
	config: TextSelectConfig;
	update: (value: GenericActivityConfig) => void;
}) {
	return (
		<>
			{config.tasks.map((task, index) => {
				const set = (value: typeof task) =>
					update({
						...config,
						tasks: config.tasks.map((item) =>
							item.id === task.id ? value : item,
						),
					});
				return (
					<fieldset
						key={task.id}
						className="grid min-w-0 gap-4 rounded-lg border p-4"
					>
						<legend className="px-1 font-semibold">
							{m.learner_task_number({
								index: index + 1,
								total: config.tasks.length,
							})}{" "}
							· {task.id}
						</legend>
						<Meta
							task={task}
							update={(key, value) => set({ ...task, [key]: value })}
						/>
						{task.segments.map((segment) => (
							<fieldset
								key={segment.id}
								className="grid min-w-0 gap-3 rounded-md bg-muted p-4"
							>
								<legend className="text-sm">{segment.id}</legend>
								<TextField
									label={m.activity_part_text()}
									value={segment.text}
									onChange={(text) =>
										set({
											...task,
											segments: task.segments.map((item) =>
												item.id === segment.id ? { ...item, text } : item,
											),
										})
									}
								/>
								<Toggle
									label={m.activity_correct_part()}
									checked={task.answerIds.includes(segment.id)}
									onChange={(checked) =>
										set({
											...task,
											answerIds: checked
												? [...new Set([...task.answerIds, segment.id])]
												: task.answerIds.filter((id) => id !== segment.id),
										})
									}
								/>
								<Remove
									disabled={task.segments.length <= 2}
									onClick={() =>
										set({
											...task,
											segments: task.segments.filter(
												(item) => item.id !== segment.id,
											),
											answerIds: task.answerIds.filter(
												(id) => id !== segment.id,
											),
										})
									}
								/>
							</fieldset>
						))}
						<Button
							type="button"
							variant="outline"
							disabled={task.segments.length >= 20}
							onClick={() =>
								set({
									...task,
									segments: [
										...task.segments,
										{ id: nextId("part", task.segments), text: "New part" },
									],
								})
							}
						>
							{m.activity_add_part()}
						</Button>
						<Remove
							disabled={config.tasks.length <= 1}
							onClick={() =>
								update({
									...config,
									tasks: config.tasks.filter((item) => item.id !== task.id),
								})
							}
						/>
					</fieldset>
				);
			})}
			<Button
				type="button"
				variant="outline"
				disabled={config.tasks.length >= 12}
				onClick={() =>
					update({
						...config,
						tasks: [
							...config.tasks,
							{ ...config.tasks[0], id: nextId("task", config.tasks) },
						],
					})
				}
			>
				{m.activity_add_task()}
			</Button>
		</>
	);
}
function ErrorTasks({
	config,
	update,
}: {
	config: ErrorSpotConfig;
	update: (value: GenericActivityConfig) => void;
}) {
	return (
		<>
			{config.tasks.map((task, index) => {
				const set = (value: typeof task) =>
					update({
						...config,
						tasks: config.tasks.map((item) =>
							item.id === task.id ? value : item,
						),
					});
				return (
					<fieldset
						key={task.id}
						className="grid min-w-0 gap-4 rounded-lg border p-4"
					>
						<legend className="px-1 font-semibold">
							{m.learner_task_number({
								index: index + 1,
								total: config.tasks.length,
							})}{" "}
							· {task.id}
						</legend>
						<Meta
							task={task}
							update={(key, value) => set({ ...task, [key]: value })}
						/>
						{task.fields.map((field) => (
							<fieldset
								key={field.id}
								className="grid min-w-0 gap-3 rounded-md bg-muted p-4"
							>
								<legend className="text-sm">{field.id}</legend>
								<TextField
									label={m.activity_field_label()}
									value={field.label}
									onChange={(label) =>
										set({
											...task,
											fields: task.fields.map((item) =>
												item.id === field.id ? { ...item, label } : item,
											),
										})
									}
								/>
								<TextField
									label={m.activity_field_value()}
									value={field.value}
									onChange={(value) =>
										set({
											...task,
											fields: task.fields.map((item) =>
												item.id === field.id ? { ...item, value } : item,
											),
										})
									}
								/>
								<Remove
									disabled={task.fields.length <= 2}
									onClick={() =>
										set({
											...task,
											fields: task.fields.filter(
												(item) => item.id !== field.id,
											),
										})
									}
								/>
							</fieldset>
						))}
						<Button
							type="button"
							variant="outline"
							disabled={task.fields.length >= 10}
							onClick={() =>
								set({
									...task,
									fields: [
										...task.fields,
										{
											id: nextId("field", task.fields),
											label: "New field",
											value: "Value",
										},
									],
								})
							}
						>
							{m.activity_add_field()}
						</Button>
						<Label className="grid gap-2">
							{m.activity_error_field()}
							<NativeSelect
								value={task.errorFieldId}
								onChange={(event) =>
									set({ ...task, errorFieldId: event.target.value })
								}
							>
								{task.fields.map((field) => (
									<NativeSelectOption key={field.id} value={field.id}>
										{field.label} · {field.id}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</Label>
						<TextField
							label={m.activity_accepted_values()}
							value={task.acceptedValues.join("\n")}
							multiline
							maxLength={5010}
							onChange={(value) =>
								set({ ...task, acceptedValues: value.split("\n") })
							}
						/>
						<Toggle
							label={m.activity_case_sensitive()}
							checked={task.caseSensitive}
							onChange={(caseSensitive) => set({ ...task, caseSensitive })}
						/>
						<Remove
							disabled={config.tasks.length <= 1}
							onClick={() =>
								update({
									...config,
									tasks: config.tasks.filter((item) => item.id !== task.id),
								})
							}
						/>
					</fieldset>
				);
			})}
			<Button
				type="button"
				variant="outline"
				disabled={config.tasks.length >= 12}
				onClick={() =>
					update({
						...config,
						tasks: [
							...config.tasks,
							{ ...config.tasks[0], id: nextId("task", config.tasks) },
						],
					})
				}
			>
				{m.activity_add_task()}
			</Button>
		</>
	);
}
function Scenario({
	config,
	update,
}: {
	config: BranchingConfig;
	update: (value: GenericActivityConfig) => void;
}) {
	return (
		<>
			<Label className="grid gap-2">
				{m.activity_start_stage()}
				<NativeSelect
					value={config.startId}
					onChange={(event) =>
						update({ ...config, startId: event.target.value })
					}
				>
					{config.nodes
						.filter((node) => node.type === "decision")
						.map((node) => (
							<NativeSelectOption key={node.id} value={node.id}>
								{node.title} · {node.id}
							</NativeSelectOption>
						))}
				</NativeSelect>
			</Label>
			{config.nodes.map((node) => {
				const set = (value: typeof node) =>
					update({
						...config,
						nodes: config.nodes.map((item) =>
							item.id === node.id ? value : item,
						),
					});
				return (
					<fieldset
						key={node.id}
						className="grid min-w-0 gap-4 rounded-lg border p-4"
					>
						<legend className="px-1 font-semibold">{node.id}</legend>
						<TextField
							label={m.activity_node_title()}
							value={node.title}
							onChange={(title) => set({ ...node, title })}
						/>
						<TextField
							label={m.activity_node_text()}
							value={node.text}
							multiline
							onChange={(text) => set({ ...node, text })}
						/>
						{node.type === "decision" ? (
							<>
								<TextField
									label={m.activity_hint_text()}
									value={node.hint}
									onChange={(hint) => set({ ...node, hint })}
								/>
								{node.choices.map((choice) => (
									<fieldset
										key={choice.id}
										className="grid min-w-0 gap-3 rounded-md bg-muted p-4"
									>
										<legend className="text-sm">{choice.id}</legend>
										<TextField
											label={m.activity_choice_text()}
											value={choice.text}
											onChange={(text) =>
												set({
													...node,
													choices: node.choices.map((item) =>
														item.id === choice.id ? { ...item, text } : item,
													),
												})
											}
										/>
										<TextField
											label={m.activity_explanation()}
											value={choice.explanation}
											multiline
											onChange={(explanation) =>
												set({
													...node,
													choices: node.choices.map((item) =>
														item.id === choice.id
															? { ...item, explanation }
															: item,
													),
												})
											}
										/>
										<Label className="grid gap-2">
											{m.activity_choice_target()}
											<NativeSelect
												value={choice.nextId}
												onChange={(event) =>
													set({
														...node,
														choices: node.choices.map((item) =>
															item.id === choice.id
																? { ...item, nextId: event.target.value }
																: item,
														),
													})
												}
											>
												{config.nodes.map((target) => (
													<NativeSelectOption key={target.id} value={target.id}>
														{target.title} · {target.id}
													</NativeSelectOption>
												))}
											</NativeSelect>
										</Label>
										<Remove
											disabled={node.choices.length <= 2}
											onClick={() =>
												set({
													...node,
													choices: node.choices.filter(
														(item) => item.id !== choice.id,
													),
												})
											}
										/>
									</fieldset>
								))}
								<Button
									type="button"
									variant="outline"
									disabled={node.choices.length >= 6}
									onClick={() =>
										set({
											...node,
											choices: [
												...node.choices,
												{
													id: nextId("choice", node.choices),
													text: "New choice",
													explanation: "Explain this choice.",
													nextId:
														config.nodes.find((item) => item.type === "outcome")
															?.id ?? config.startId,
												},
											],
										})
									}
								>
									{m.activity_add_choice()}
								</Button>
							</>
						) : (
							<Label className="grid gap-2">
								{m.activity_outcome()}
								<NativeSelect
									value={node.outcome}
									onChange={(event) =>
										set({
											...node,
											outcome:
												event.target.value === "success" ? "success" : "retry",
										})
									}
								>
									<NativeSelectOption value="success">
										{m.activity_success()}
									</NativeSelectOption>
									<NativeSelectOption value="retry">
										{m.activity_retry()}
									</NativeSelectOption>
								</NativeSelect>
							</Label>
						)}
						<Remove
							disabled={config.nodes.length <= 3 || node.id === config.startId}
							onClick={() =>
								update({
									...config,
									nodes: config.nodes.filter((item) => item.id !== node.id),
								})
							}
						/>
					</fieldset>
				);
			})}
			<div className="flex flex-wrap gap-3">
				<Button
					type="button"
					variant="outline"
					disabled={config.nodes.length >= 20}
					onClick={() =>
						update({
							...config,
							nodes: [
								...config.nodes,
								{
									id: nextId("stage", config.nodes),
									type: "decision",
									title: "New decision",
									text: "Describe the evidence.",
									hint: "Help the learner reason about it.",
									choices: [
										{
											id: "one",
											text: "First choice",
											nextId:
												config.nodes.find((node) => node.type === "outcome")
													?.id ?? config.startId,
											explanation: "Explain the choice.",
										},
										{
											id: "two",
											text: "Second choice",
											nextId:
												config.nodes.find((node) => node.type === "outcome")
													?.id ?? config.startId,
											explanation: "Explain the choice.",
										},
									],
								},
							],
						})
					}
				>
					{m.activity_add_decision()}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={config.nodes.length >= 20}
					onClick={() =>
						update({
							...config,
							nodes: [
								...config.nodes,
								{
									id: nextId("outcome", config.nodes),
									type: "outcome",
									title: "New outcome",
									text: "Explain the result.",
									outcome: "retry",
								},
							],
						})
					}
				>
					{m.activity_add_outcome()}
				</Button>
			</div>
		</>
	);
}
