import { useContext, useEffect, useId, useRef, useState } from "react";
import {
	type BranchingConfig,
	correctionResult,
	type ErrorSpotConfig,
	scenarioNext,
	selectionCorrect,
	type TextSelectConfig,
} from "../lib/generic-activity";
import * as m from "../paraglide/messages.js";
import { LessonLanguage } from "./lesson-language";
import { Feedback, Frame } from "./practice-frame";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

function Hint({ text }: { text: string }) {
	const language = useContext(LessonLanguage);
	return (
		<Accordion>
			<AccordionItem value="hint">
				<AccordionTrigger>
					{m.activity_hint({}, { locale: language })}
				</AccordionTrigger>
				<AccordionContent className="text-base">{text}</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}

/** Local practice state only. No progress or provider calls are made here. */
export function SelectionPractice({
	config,
}: {
	config: TextSelectConfig | ErrorSpotConfig;
}) {
	const language = useContext(LessonLanguage);
	const [index, setIndex] = useState(0);
	const [answers, setAnswers] = useState<
		Map<string, { selected: string[]; value: string }>
	>(() => new Map());
	const [checked, setChecked] = useState<Set<string>>(() => new Set());
	const task = config.tasks[index];
	const answer = answers.get(task.id) ?? { selected: [], value: "" };
	const id = useId();
	const heading = useRef<HTMLParagraphElement>(null);
	const moved = useRef(false);
	useEffect(() => {
		if (moved.current && task.id) heading.current?.focus();
	}, [task.id]);
	function update(selected: string[], value = answer.value) {
		setAnswers(new Map(answers).set(task.id, { selected, value }));
		setChecked(new Set([...checked].filter((id) => id !== task.id)));
	}
	function changeTask(next: number) {
		moved.current = true;
		setIndex(next);
	}
	const correction =
		config.kind === "error-spot"
			? correctionResult(
					config.tasks[index],
					answer.selected[0] ?? "",
					answer.value,
				)
			: null;
	const correct =
		config.kind === "text-select"
			? selectionCorrect(config.tasks[index], answer.selected)
			: Boolean(correction?.correct);
	const empty =
		!answer.selected.length ||
		(config.kind === "error-spot" && !answer.value.trim());
	return (
		<Frame title={config.title}>
			<p>
				{config.kind === "text-select"
					? m.activity_select_instruction({}, { locale: language })
					: m.activity_error_instruction({}, { locale: language })}
			</p>
			<p ref={heading} tabIndex={-1} className="font-semibold tabular-nums">
				{m.learner_task_number(
					{ index: index + 1, total: config.tasks.length },
					{ locale: language },
				)}
			</p>
			<fieldset
				className="grid min-w-0 gap-4"
				aria-describedby={`${id}-feedback`}
			>
				<legend className="mb-4 max-w-full font-semibold [overflow-wrap:anywhere]">
					{task.prompt}
				</legend>
				{config.kind === "text-select" ? (
					<div className="flex flex-wrap gap-3">
						{config.tasks[index].segments.map((segment) => (
							<Button
								key={segment.id}
								type="button"
								variant={
									answer.selected.includes(segment.id) ? "default" : "outline"
								}
								aria-pressed={answer.selected.includes(segment.id)}
								className="h-auto min-h-11 min-w-11 max-w-full whitespace-normal break-all font-mono"
								onClick={() =>
									update(
										answer.selected.includes(segment.id)
											? answer.selected.filter((key) => key !== segment.id)
											: [...answer.selected, segment.id],
									)
								}
							>
								{answer.selected.includes(segment.id) && (
									<span aria-hidden="true">✓</span>
								)}
								{segment.text}
							</Button>
						))}
					</div>
				) : (
					<>
						<RadioGroup
							aria-label={m.activity_error_field({}, { locale: language })}
							value={answer.selected[0] ?? ""}
							onValueChange={(value) => {
								if (typeof value === "string") update([value], "");
							}}
						>
							{config.tasks[index].fields.map((field) => (
								<Label
									key={field.id}
									htmlFor={`${id}-${field.id}`}
									className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 text-base leading-relaxed"
								>
									<RadioGroupItem
										id={`${id}-${field.id}`}
										value={field.id}
										className="mt-1 shrink-0"
									/>
									<span className="grid min-w-0 gap-1">
										<span className="font-semibold">{field.label}</span>
										<span className="break-all font-mono">{field.value}</span>
									</span>
								</Label>
							))}
						</RadioGroup>
						<div className="grid gap-2">
							<Label htmlFor={`${id}-correction`}>
								{m.activity_correction({}, { locale: language })}
							</Label>
							<Input
								id={`${id}-correction`}
								autoComplete="off"
								maxLength={500}
								value={answer.value}
								aria-invalid={
									checked.has(task.id) && (!correction?.valueCorrect || empty)
										? true
										: undefined
								}
								aria-describedby={`${id}-feedback`}
								onChange={(event) =>
									update(answer.selected, event.target.value)
								}
							/>
						</div>
					</>
				)}
				<Hint key={task.id} text={task.hint} />
				<Button
					className="justify-self-start"
					onClick={() => setChecked(new Set([...checked, task.id]))}
				>
					{m.learner_check_answer({}, { locale: language })}
				</Button>
				<div id={`${id}-feedback`}>
					<Feedback active={checked.has(task.id)}>
						{empty ? (
							m.activity_answer_required({}, { locale: language })
						) : (
							<>
								{correct
									? m.learner_correct({}, { locale: language })
									: m.learner_not_quite({}, { locale: language })}{" "}
								{correction && !correct
									? correction.fieldCorrect
										? m.activity_check_correction({}, { locale: language })
										: m.activity_check_field({}, { locale: language })
									: ""}{" "}
								{task.explanation}
							</>
						)}
					</Feedback>
				</div>
			</fieldset>
			<div className="flex flex-wrap gap-3">
				<Button
					variant="outline"
					disabled={index === 0}
					onClick={() => changeTask(index - 1)}
				>
					{m.learner_previous_task({}, { locale: language })}
				</Button>
				<Button
					variant="outline"
					disabled={
						!checked.has(task.id) || empty || index === config.tasks.length - 1
					}
					onClick={() => changeTask(index + 1)}
				>
					{m.learner_next_task({}, { locale: language })}
				</Button>
				<Button
					variant="outline"
					onClick={() => {
						setAnswers(new Map());
						setChecked(new Set());
						changeTask(0);
					}}
				>
					{m.activity_reset({}, { locale: language })}
				</Button>
			</div>
		</Frame>
	);
}

export function BranchingPractice({ config }: { config: BranchingConfig }) {
	const language = useContext(LessonLanguage);
	const [path, setPath] = useState<string[]>([config.startId]);
	const [choiceId, setChoiceId] = useState("");
	const [checked, setChecked] = useState(false);
	const id = useId();
	const heading = useRef<HTMLHeadingElement>(null);
	const moved = useRef(false);
	const current = config.nodes.find(
		(node) => node.id === path[path.length - 1],
	);
	useEffect(() => {
		if (moved.current && current?.id) heading.current?.focus();
	}, [current?.id]);
	if (!current) return null;
	const choice =
		current.type === "decision"
			? current.choices.find((item) => item.id === choiceId)
			: null;
	function move(next: string[]) {
		moved.current = true;
		setPath(next);
		setChoiceId("");
		setChecked(false);
	}
	return (
		<Frame title={config.title}>
			<p>{m.activity_branch_instruction({}, { locale: language })}</p>
			<p className="text-muted-foreground">
				{m.activity_stage({ number: path.length }, { locale: language })}
			</p>
			<h3 ref={heading} tabIndex={-1} className="text-xl font-semibold">
				{current.title}
			</h3>
			<p className="whitespace-pre-wrap">{current.text}</p>
			{current.type === "decision" ? (
				<>
					<RadioGroup
						aria-label={m.activity_next_decision({}, { locale: language })}
						value={choiceId}
						onValueChange={(value) => {
							if (typeof value === "string") {
								setChoiceId(value);
								setChecked(false);
							}
						}}
					>
						{current.choices.map((item) => (
							<Label
								key={item.id}
								htmlFor={`${id}-${item.id}`}
								className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 text-base leading-relaxed"
							>
								<RadioGroupItem
									id={`${id}-${item.id}`}
									value={item.id}
									className="mt-1 shrink-0"
								/>
								<span className="min-w-0 break-words">{item.text}</span>
							</Label>
						))}
					</RadioGroup>
					<Hint key={current.id} text={current.hint} />
					<Button
						className="justify-self-start"
						onClick={() => setChecked(true)}
					>
						{m.learner_check_answer({}, { locale: language })}
					</Button>
					<Feedback active={checked}>
						{choice
							? choice.explanation
							: m.activity_choose_decision({}, { locale: language })}
					</Feedback>
					<Button
						className="justify-self-start"
						disabled={!checked || !choice}
						onClick={() => {
							const next = scenarioNext(config, current.id, choiceId);
							if (next) move([...path, next]);
						}}
					>
						{m.activity_continue_scenario({}, { locale: language })}
					</Button>
				</>
			) : (
				<Feedback active>
					{current.outcome === "success"
						? m.activity_scenario_success({}, { locale: language })
						: m.activity_scenario_retry({}, { locale: language })}
				</Feedback>
			)}
			<div className="flex flex-wrap gap-3">
				<Button
					variant="outline"
					disabled={path.length === 1}
					onClick={() => move(path.slice(0, -1))}
				>
					{m.activity_previous_decision({}, { locale: language })}
				</Button>
				<Button variant="outline" onClick={() => move([config.startId])}>
					{m.activity_reset({}, { locale: language })}
				</Button>
			</div>
		</Frame>
	);
}
