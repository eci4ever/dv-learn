import { type ReactNode, useId, useState } from "react";
import {
	type CacheConfig,
	cacheRun,
	parseActivity,
	type QuizConfig,
	quizResults,
	type RecordsConfig,
	recordFeedback,
	recordTypes,
	resultTypes,
	type TraceConfig,
} from "../lib/lesson-activity";
import type { Lesson } from "../server/contracts";
import { IPAddressLab } from "./ip-address-lab";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

function Frame({ title, children }: { title: string; children: ReactNode }) {
	return (
		<Card
			className="lesson-practice my-8 min-w-0"
			data-testid="lesson-activity"
		>
			<CardHeader>
				<Badge variant="secondary" className="w-fit">
					Interactive practice
				</Badge>
				<CardTitle className="text-xl">
					<h2>{title}</h2>
				</CardTitle>
				<p className="text-muted-foreground">
					Safe, offline practice. Try, check and retry. Answers reset when you
					reload; saved lesson completion is separate.
				</p>
			</CardHeader>
			<CardContent className="grid gap-6 min-w-0">{children}</CardContent>
		</Card>
	);
}
function Feedback({ children }: { children: ReactNode }) {
	return (
		<Alert role="status">
			<AlertDescription className="text-base break-words">
				{children}
			</AlertDescription>
		</Alert>
	);
}

export function LessonActivity({
	lesson,
}: {
	lesson: Pick<Lesson, "activity" | "activityConfig" | "lessonType">;
}) {
	if (lesson.activityConfig) {
		const config = parseActivity(lesson.activityConfig);
		if (!config)
			return (
				<Alert variant="destructive">
					<AlertDescription>
						This practice is not configured correctly. Please contact the course
						author.
					</AlertDescription>
				</Alert>
			);
		switch (config.kind) {
			case "practice-quiz":
				return <PracticeQuiz config={config} />;
			case "dns-resolution":
				return <ResolutionPractice config={config} />;
			case "dns-records":
				return <RecordPractice config={config} />;
			case "dns-cache":
				return <CachePractice config={config} />;
		}
	}
	return (lesson.lessonType === "interactive" ||
		lesson.lessonType === "quiz") &&
		lesson.activity ? (
		<IPAddressLab mode={lesson.activity} />
	) : null;
}

function PracticeQuiz({ config }: { config: QuizConfig }) {
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [checked, setChecked] = useState(false);
	const prefix = useId();
	const complete = config.questions.every((q) =>
		q.choices.some((c) => c.id === answers[q.id]),
	);
	const results = quizResults(config, answers);
	const answered = config.questions.filter((q) => answers[q.id]).length;
	return (
		<Frame title={config.title}>
			<p>
				Choose one answer for every question. Check answers to read feedback,
				then retry as often as you like. This is practice, not a verified
				assessment.
			</p>
			<Progress
				aria-label="Questions answered"
				value={(answered / config.questions.length) * 100}
			/>
			<p className="tabular-nums">
				{answered} of {config.questions.length} questions answered
			</p>
			{config.questions.map((question, index) => (
				<fieldset
					key={question.id}
					className="grid gap-4 min-w-0 rounded-lg border p-4"
				>
					<legend
						className="max-w-full px-1 font-semibold [overflow-wrap:anywhere]"
						id={`${prefix}-${question.id}`}
					>
						{index + 1}. {question.prompt}
					</legend>
					<RadioGroup
						aria-labelledby={`${prefix}-${question.id}`}
						value={answers[question.id] ?? ""}
						onValueChange={(value) => {
							if (typeof value === "string") {
								setAnswers({ ...answers, [question.id]: value });
								setChecked(false);
							}
						}}
					>
						{question.choices.map((choice) => (
							<Label
								key={choice.id}
								htmlFor={`${prefix}-${question.id}-${choice.id}`}
								className="flex min-h-11 items-start gap-3 rounded-md border p-3 text-base leading-relaxed cursor-pointer"
							>
								<RadioGroupItem
									className="mt-1 shrink-0"
									id={`${prefix}-${question.id}-${choice.id}`}
									value={choice.id}
								/>
								<span className="min-w-0 break-words">{choice.text}</span>
							</Label>
						))}
					</RadioGroup>
					{checked && (
						<p>
							{results[index].correct ? "Correct." : "Not quite."}{" "}
							{question.explanation}
						</p>
					)}
				</fieldset>
			))}
			<div className="flex flex-wrap gap-3">
				<Button disabled={!complete} onClick={() => setChecked(true)}>
					Check answers
				</Button>
				<Button
					variant="outline"
					onClick={() => {
						setAnswers({});
						setChecked(false);
					}}
				>
					Reset quiz
				</Button>
			</div>
			{checked && (
				<Feedback>
					You scored {results.filter((r) => r.correct).length} out of{" "}
					{config.questions.length}. Review the explanations, then try again.
				</Feedback>
			)}
		</Frame>
	);
}

function ResolutionPractice({ config }: { config: TraceConfig }) {
	const [mode, setMode] = useState("cold");
	const [index, setIndex] = useState(0);
	const [target, setTarget] = useState("");
	const [result, setResult] = useState("");
	const [checked, setChecked] = useState(false);
	const prefix = useId();
	const steps = mode === "cold" ? config.coldSteps : config.warmSteps;
	const step = steps[index];
	const label = (role: string) =>
		config.roles.find((r) => r.id === role)?.label ?? role;
	const reset = () => {
		setIndex(0);
		setTarget("");
		setResult("");
		setChecked(false);
	};
	return (
		<Frame title={config.title}>
			<p>
				Predict each next step for the A lookup of{" "}
				<strong className="break-all">{config.queryName}</strong>. A referral
				tells the resolver where to ask next; it is not the requested address.
			</p>
			<p className="text-muted-foreground">
				Each stage combines a query and its reply. Choose who is asked, then the
				result of that stage. TLD means top-level domain, such as com.
			</p>
			<Label htmlFor={`${prefix}-mode`}>Cache mode</Label>
			<NativeSelect
				id={`${prefix}-mode`}
				value={mode}
				onChange={(e) => {
					setMode(e.target.value);
					reset();
				}}
			>
				<NativeSelectOption value="cold">
					Cold: no useful cached data
				</NativeSelectOption>
				<NativeSelectOption value="warm">
					Warm: valid cached A answer
				</NativeSelectOption>
			</NativeSelect>
			<Progress
				aria-label="Lookup steps reviewed"
				value={((index + (checked ? 1 : 0)) / steps.length) * 100}
			/>
			<p className="font-semibold tabular-nums">
				Step {index + 1} of {steps.length}: {label(step.from)}
			</p>
			<Label htmlFor={`${prefix}-target`}>Who receives the next message?</Label>
			<NativeSelect
				id={`${prefix}-target`}
				value={target}
				onChange={(e) => {
					setTarget(e.target.value);
					setChecked(false);
				}}
			>
				<NativeSelectOption value="">Choose a role</NativeSelectOption>
				{config.roles.map((r) => (
					<NativeSelectOption key={r.id} value={r.id}>
						{r.label}
					</NativeSelectOption>
				))}
			</NativeSelect>
			<Label htmlFor={`${prefix}-result`}>
				What is the result of this step?
			</Label>
			<NativeSelect
				id={`${prefix}-result`}
				value={result}
				onChange={(e) => {
					setResult(e.target.value);
					setChecked(false);
				}}
			>
				<NativeSelectOption value="">Choose a result</NativeSelectOption>
				{resultTypes.map((r) => (
					<NativeSelectOption key={r} value={r}>
						{r}
					</NativeSelectOption>
				))}
			</NativeSelect>
			<Button
				className="justify-self-start"
				disabled={!target || !result}
				onClick={() => setChecked(true)}
			>
				Check step
			</Button>
			{checked && (
				<Feedback>
					{target === step.to && result === step.result
						? "Correct."
						: "Not quite."}{" "}
					{target !== step.to
						? `Check who receives the query from ${label(step.from)}. `
						: result !== step.result
							? "The recipient is right. Check whether this stage gives a referral or the requested answer. "
							: ""}
					{label(step.from)} → {label(step.to)}. Result: {step.result}.{" "}
					{step.explanation}
					{step.result === "answer"
						? ` The fictional A answer is ${config.address}.`
						: ""}
				</Feedback>
			)}
			<div className="flex flex-wrap gap-3">
				<Button
					disabled={!checked || index === steps.length - 1}
					onClick={() => {
						setIndex(index + 1);
						setTarget("");
						setResult("");
						setChecked(false);
					}}
				>
					Next step
				</Button>
				<Button variant="outline" onClick={reset}>
					Reset lookup
				</Button>
			</div>
			{checked && index === steps.length - 1 && (
				<p>
					Trace reviewed. Compare cold and warm mode to see which outside
					queries were skipped. This model omits forwarding, query-name
					minimisation and name-server address discovery.
				</p>
			)}
		</Frame>
	);
}

type RecordAnswer = {
	owner: string;
	type: string;
	value: string;
	preference: string;
};
function RecordPractice({ config }: { config: RecordsConfig }) {
	const [answers, setAnswers] = useState<Record<string, RecordAnswer>>({});
	const [checked, setChecked] = useState(false);
	const prefix = useId();
	const empty = { owner: "", type: "", value: "", preference: "" };
	const update = (id: string, key: keyof RecordAnswer, value: string) => {
		setAnswers({
			...answers,
			[id]: { ...(answers[id] ?? empty), [key]: value },
		});
		setChecked(false);
	};
	const complete = config.tasks.every((t) => {
		const a = answers[t.id];
		return (
			a?.owner.trim() &&
			a.type &&
			a.value.trim() &&
			(a.type !== "MX" || a.preference.trim())
		);
	});
	const results = config.tasks.map((t) =>
		recordFeedback(t, answers[t.id] ?? empty),
	);
	return (
		<Frame title={config.title}>
			<p>
				Build a record for each job using the supplied names and values. These
				are exercise cards, not a deployable zone. Name-valued records take a
				DNS name, not a web URL.
			</p>
			{config.tasks.map((task, index) => {
				const answer = answers[task.id] ?? empty;
				return (
					<fieldset
						key={task.id}
						className="grid gap-3 min-w-0 rounded-lg border p-4"
					>
						<legend className="px-1 font-semibold break-words">
							{index + 1}. {task.prompt}
						</legend>
						<Label htmlFor={`${prefix}-${task.id}-owner`}>Owner name</Label>
						<Input
							id={`${prefix}-${task.id}-owner`}
							className="text-base"
							autoComplete="off"
							value={answer.owner}
							onChange={(e) => update(task.id, "owner", e.target.value)}
						/>
						<Label htmlFor={`${prefix}-${task.id}-type`}>Record type</Label>
						<NativeSelect
							id={`${prefix}-${task.id}-type`}
							value={answer.type}
							onChange={(e) => update(task.id, "type", e.target.value)}
						>
							<NativeSelectOption value="">Choose a type</NativeSelectOption>
							{recordTypes.map((type) => (
								<NativeSelectOption key={type} value={type}>
									{type}
								</NativeSelectOption>
							))}
						</NativeSelect>
						<Label htmlFor={`${prefix}-${task.id}-value`}>Record value</Label>
						<Input
							id={`${prefix}-${task.id}-value`}
							className="text-base"
							autoComplete="off"
							value={answer.value}
							onChange={(e) => update(task.id, "value", e.target.value)}
						/>
						{answer.type === "MX" && (
							<>
								<Label htmlFor={`${prefix}-${task.id}-preference`}>
									Mail preference
								</Label>
								<Input
									id={`${prefix}-${task.id}-preference`}
									type="number"
									min={0}
									max={65535}
									value={answer.preference}
									onChange={(e) =>
										update(task.id, "preference", e.target.value)
									}
								/>
							</>
						)}
						<p className="text-muted-foreground">Hint: {task.hint}</p>
						{checked && (
							<p role="status">
								{results[index].length
									? results[index].join(" ")
									: `Correct. ${task.explanation}`}
							</p>
						)}
					</fieldset>
				);
			})}
			<div className="flex flex-wrap gap-3">
				<Button disabled={!complete} onClick={() => setChecked(true)}>
					Check records
				</Button>
				<Button
					variant="outline"
					onClick={() => {
						setAnswers({});
						setChecked(false);
					}}
				>
					Reset records
				</Button>
			</div>
			{checked && (
				<Feedback>
					{results.filter((r) => r.length === 0).length} of{" "}
					{config.tasks.length} records match their jobs. Edit a field to retry.
				</Feedback>
			)}
		</Frame>
	);
}

function CachePractice({ config }: { config: CacheConfig }) {
	const [index, setIndex] = useState(0);
	const [address, setAddress] = useState("");
	const [ttl, setTtl] = useState("");
	const [checked, setChecked] = useState(false);
	const prefix = useId();
	const results = cacheRun(config);
	const current = results[index];
	const reset = () => {
		setIndex(0);
		setAddress("");
		setTtl("");
		setChecked(false);
	};
	const valid = /^\d+$/.test(ttl.trim()) && Number(ttl) <= 86400;
	return (
		<Frame title={config.title}>
			<p>
				The resolver stores{" "}
				<strong className="break-all">{config.queryName}</strong> as{" "}
				{config.initialAddress} at t=0, with TTL {config.ttlSeconds} seconds. At
				t={config.changeAt}, the authority changes it to {config.updatedAddress}
				. There is no early eviction, prefetch or stale-answer serving.
			</p>
			<p>
				Use virtual time—no real waiting. Predict the answer{" "}
				<strong>after</strong> each query. Expiry is processed before a query at
				the exact expiry time.
			</p>
			<Progress
				aria-label="Cache predictions reviewed"
				value={((index + (checked ? 1 : 0)) / results.length) * 100}
			/>
			<p className="text-xl font-semibold tabular-nums">
				Query {index + 1} of {results.length}: t={current.time} seconds
			</p>
			<Label htmlFor={`${prefix}-address`}>Predicted IPv4 answer</Label>
			<Input
				id={`${prefix}-address`}
				value={address}
				autoComplete="off"
				onChange={(e) => {
					setAddress(e.target.value);
					setChecked(false);
				}}
			/>
			<Label htmlFor={`${prefix}-ttl`}>
				Remaining TTL after the query (seconds)
			</Label>
			<Input
				id={`${prefix}-ttl`}
				type="number"
				min={0}
				max={86400}
				step={1}
				value={ttl}
				onChange={(e) => {
					setTtl(e.target.value);
					setChecked(false);
				}}
			/>
			<Button
				className="justify-self-start"
				disabled={!address.trim() || !valid}
				onClick={() => setChecked(true)}
			>
				Check prediction
			</Button>
			{checked && (
				<Feedback>
					{address.trim() === current.address && Number(ttl) === current.ttl
						? "Correct."
						: "Not quite."}{" "}
					Cached answer: {current.address}. Remaining TTL: {current.ttl}{" "}
					seconds. Authoritative answer: {current.authoritative}.{" "}
					{current.refreshed
						? "The previous entry expired. This query fetched the current authoritative answer and started a new TTL."
						: "The existing cache entry is still valid in this model; changing the authority does not replace it."}
				</Feedback>
			)}
			<div className="flex flex-wrap gap-3">
				<Button
					disabled={!checked || index === results.length - 1}
					onClick={() => {
						setIndex(index + 1);
						setAddress("");
						setTtl("");
						setChecked(false);
					}}
				>
					Next query
				</Button>
				<Button variant="outline" onClick={reset}>
					Reset timeline
				</Button>
			</div>
			{checked && index === results.length - 1 && (
				<p>
					Timeline reviewed. A successful refresh starts a new TTL; changing an
					authoritative record alone does not. Reset to replay from t=0.
				</p>
			)}
		</Frame>
	);
}
