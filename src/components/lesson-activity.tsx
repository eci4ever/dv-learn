import { useContext, useEffect, useId, useRef, useState } from "react";
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
import * as m from "../paraglide/messages.js";
import type { Lesson } from "../server/contracts";
import { AppLink } from "./app-link";
import { BranchingPractice, SelectionPractice } from "./generic-activity";
import { IPAddressLab } from "./ip-address-lab";
import { LessonLanguage } from "./lesson-language";
import { Feedback, Frame } from "./practice-frame";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

export function LessonActivity({
	lesson,
	reviewLessons = [],
}: {
	lesson: Pick<Lesson, "activity" | "activityConfig" | "lessonType">;
	reviewLessons?: readonly ReviewLesson[];
}) {
	const language = useContext(LessonLanguage);
	if (lesson.activityConfig) {
		const config = parseActivity(lesson.activityConfig);
		if (!config)
			return (
				<Alert variant="destructive">
					<AlertDescription>
						{m.learner_this_practice_is_not_configured_correctly_please_contact_the_course_author(
							{},
							{ locale: language },
						)}
					</AlertDescription>
				</Alert>
			);
		switch (config.kind) {
			case "text-select":
			case "error-spot":
				return <SelectionPractice config={config} />;
			case "branching-scenario":
				return <BranchingPractice config={config} />;
			case "practice-quiz":
				return <PracticeQuiz config={config} reviewLessons={reviewLessons} />;
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

export type ReviewLesson = { id: string; title: string; href: string };
function PracticeQuiz({
	config,
	reviewLessons,
}: {
	config: QuizConfig;
	reviewLessons: readonly ReviewLesson[];
}) {
	const language = useContext(LessonLanguage);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [checked, setChecked] = useState<Record<string, boolean>>({});
	const [index, setIndex] = useState(0);
	const heading = useRef<HTMLParagraphElement>(null);
	const prefix = useId();
	useEffect(() => {
		if (index > 0) heading.current?.focus();
	}, [index]);
	const question = config.questions[index];
	const results = quizResults(config, answers);
	const answered = config.questions.filter((item) => answers[item.id]).length;
	const complete = question.choices.some(
		(choice) => choice.id === answers[question.id],
	);
	const review = reviewLessons.find(
		(lesson) => lesson.id === question.lessonId,
	);
	return (
		<Frame title={config.title}>
			<p>
				{m.learner_choose_one_answer_check_the_explanation_then_continue_you_can_go_back_and_retry_answers_reset_i(
					{},
					{ locale: language },
				)}
			</p>
			<Progress
				aria-label={m.learner_questions_answered({}, { locale: language })}
				value={(answered / config.questions.length) * 100}
			/>
			<p
				ref={heading}
				tabIndex={-1}
				className="text-xl font-semibold tabular-nums"
			>
				{m.learner_question_number(
					{ index: index + 1, total: config.questions.length },
					{ locale: language },
				)}
			</p>
			<fieldset key={question.id} className="grid gap-4 min-w-0">
				<legend
					id={`${prefix}-question`}
					className="max-w-full px-1 font-semibold [overflow-wrap:anywhere]"
				>
					{question.prompt}
				</legend>
				<RadioGroup
					aria-labelledby={`${prefix}-question`}
					value={answers[question.id] ?? ""}
					onValueChange={(value) => {
						if (typeof value === "string") {
							setAnswers({ ...answers, [question.id]: value });
							setChecked({ ...checked, [question.id]: false });
						}
					}}
				>
					{question.choices.map((choice) => (
						<Label
							key={choice.id}
							htmlFor={`${prefix}-${choice.id}`}
							className="flex min-h-11 items-start gap-3 rounded-md border p-3 text-base leading-relaxed cursor-pointer"
						>
							<RadioGroupItem
								className="mt-1 shrink-0"
								id={`${prefix}-${choice.id}`}
								value={choice.id}
							/>
							<span className="min-w-0 break-words">{choice.text}</span>
						</Label>
					))}
				</RadioGroup>
				<Button
					className="justify-self-start"
					disabled={!complete}
					onClick={() => setChecked({ ...checked, [question.id]: true })}
				>
					{m.learner_check_answer({}, { locale: language })}
				</Button>
				<Feedback active={Boolean(checked[question.id])}>
					{results[index].correct
						? m.learner_correct({}, { locale: language })
						: m.learner_not_quite({}, { locale: language })}{" "}
					{question.explanation}
				</Feedback>
				{checked[question.id] && !results[index].correct && review && (
					<Button
						variant="outline"
						role="link"
						nativeButton={false}
						className="h-auto min-h-11 justify-self-start whitespace-normal text-left"
						render={<AppLink href={review.href} />}
					>
						{m.learner_review_lesson_value0(
							{ value0: review.title },
							{ locale: language },
						)}
					</Button>
				)}
			</fieldset>
			<div className="flex flex-wrap gap-3">
				<Button
					variant="outline"
					disabled={index === 0}
					onClick={() => setIndex(index - 1)}
				>
					{m.learner_previous_question({}, { locale: language })}
				</Button>
				<Button
					variant="outline"
					disabled={
						!checked[question.id] || index === config.questions.length - 1
					}
					onClick={() => setIndex(index + 1)}
				>
					{m.learner_next_question({}, { locale: language })}
				</Button>
				<Button
					variant="outline"
					onClick={() => {
						setAnswers({});
						setChecked({});
						setIndex(0);
					}}
				>
					{m.learner_reset_quiz({}, { locale: language })}
				</Button>
			</div>
			<Feedback active={config.questions.every((item) => checked[item.id])}>
				{m.learner_quiz_score(
					{
						correct: results.filter((result) => result.correct).length,
						total: config.questions.length,
					},
					{ locale: language },
				)}{" "}
				{m.learner_review_the_explanations_then_try_again_lesson_completion_is_separate(
					{},
					{ locale: language },
				)}
			</Feedback>
			<p className="text-muted-foreground">
				{m.learner_practice_only_your_score_does_not_control_lesson_completion(
					{},
					{ locale: language },
				)}
			</p>
		</Frame>
	);
}

function ResolutionPractice({ config }: { config: TraceConfig }) {
	const language = useContext(LessonLanguage);
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
				{m.learner_lookup_prompt(
					{ name: config.queryName },
					{ locale: language },
				)}{" "}
				{m.learner_a_referral_tells_the_resolver_where_to_ask_next_it_is_not_the_requested_address(
					{},
					{ locale: language },
				)}
			</p>
			<p className="text-muted-foreground">
				{m.learner_each_stage_combines_a_query_and_its_reply_choose_who_is_asked_then_the_result_of_that_stage_tld(
					{},
					{ locale: language },
				)}
			</p>
			<div className="grid gap-2">
				<Label htmlFor={`${prefix}-mode`}>
					{m.learner_cache_mode({}, { locale: language })}
				</Label>
				<Select
					items={[
						{
							value: "cold",
							label: m.learner_cold_no_useful_cached_data(
								{},
								{ locale: language },
							),
						},
						{
							value: "warm",
							label: m.learner_warm_valid_cached_a_answer(
								{},
								{ locale: language },
							),
						},
					]}
					value={mode}
					onValueChange={(value) => {
						if (value !== "cold" && value !== "warm") return;
						setMode(value);
						reset();
					}}
				>
					<SelectTrigger
						id={`${prefix}-mode`}
						className="w-full min-h-11 text-base"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent
						lang={language}
						alignItemWithTrigger={false}
						align="start"
					>
						<SelectItem value="cold">
							{m.learner_cold_no_useful_cached_data({}, { locale: language })}
						</SelectItem>
						<SelectItem value="warm">
							{m.learner_warm_valid_cached_a_answer({}, { locale: language })}
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<Progress
				aria-label={m.learner_lookup_steps_reviewed({}, { locale: language })}
				value={((index + (checked ? 1 : 0)) / steps.length) * 100}
			/>
			<p className="font-semibold tabular-nums">
				{m.learner_lookup_step(
					{ index: index + 1, total: steps.length, role: label(step.from) },
					{ locale: language },
				)}
			</p>
			<div className="grid gap-2">
				<Label htmlFor={`${prefix}-target`}>
					{m.learner_who_receives_the_next_message({}, { locale: language })}
				</Label>
				<NativeSelect
					id={`${prefix}-target`}
					value={target}
					onChange={(e) => {
						setTarget(e.target.value);
						setChecked(false);
					}}
				>
					<NativeSelectOption value="">
						{m.learner_choose_a_role({}, { locale: language })}
					</NativeSelectOption>
					{config.roles.map((r) => (
						<NativeSelectOption key={r.id} value={r.id}>
							{r.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</div>
			<div className="grid gap-2">
				<Label htmlFor={`${prefix}-result`}>
					{m.learner_what_is_the_result_of_this_step({}, { locale: language })}
				</Label>
				<NativeSelect
					id={`${prefix}-result`}
					value={result}
					onChange={(e) => {
						setResult(e.target.value);
						setChecked(false);
					}}
				>
					<NativeSelectOption value="">
						{m.learner_choose_a_result({}, { locale: language })}
					</NativeSelectOption>
					{resultTypes.map((r) => (
						<NativeSelectOption key={r} value={r}>
							{r}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</div>
			<Button
				className="justify-self-start"
				disabled={!target || !result}
				onClick={() => setChecked(true)}
			>
				{m.learner_check_step({}, { locale: language })}
			</Button>
			<Feedback active={checked}>
				{target === step.to && result === step.result
					? m.learner_correct({}, { locale: language })
					: m.learner_not_quite({}, { locale: language })}{" "}
				{target !== step.to
					? m.learner_check_who_receives_the_query_from_value0(
							{ value0: label(step.from) },
							{ locale: language },
						)
					: result !== step.result
						? m.learner_the_recipient_is_right_check_whether_this_stage_gives_a_referral_or_the_requested_answer(
								{},
								{ locale: language },
							)
						: ""}
				{m.learner_lookup_result(
					{
						from: label(step.from),
						to: label(step.to),
						result: step.result,
						explanation: step.explanation,
					},
					{ locale: language },
				)}
				{step.result === "answer"
					? m.learner_the_fictional_a_answer_is_value0(
							{ value0: config.address },
							{ locale: language },
						)
					: ""}
			</Feedback>
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
					{m.learner_next_step({}, { locale: language })}
				</Button>
				<Button variant="outline" onClick={reset}>
					{m.learner_reset_lookup({}, { locale: language })}
				</Button>
			</div>
			{checked && index === steps.length - 1 && (
				<p>
					{m.learner_trace_reviewed_compare_cold_and_warm_mode_to_see_which_outside_queries_were_skipped_this_model_(
						{},
						{ locale: language },
					)}
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
	const language = useContext(LessonLanguage);
	const [answers, setAnswers] = useState<Record<string, RecordAnswer>>({});
	const [checked, setChecked] = useState<Record<string, boolean>>({});
	const [index, setIndex] = useState(0);
	const heading = useRef<HTMLParagraphElement>(null);
	const prefix = useId();
	useEffect(() => {
		if (index > 0) heading.current?.focus();
	}, [index]);
	const empty = { owner: "", type: "", value: "", preference: "" };
	const task = config.tasks[index];
	const answer = answers[task.id] ?? empty;
	const update = (key: keyof RecordAnswer, value: string) => {
		setAnswers({ ...answers, [task.id]: { ...answer, [key]: value } });
		setChecked({ ...checked, [task.id]: false });
	};
	const complete = Boolean(
		answer.owner.trim() &&
			answer.type &&
			answer.value.trim() &&
			(answer.type !== "MX" || answer.preference.trim()),
	);
	const feedback = recordFeedback(task, answer, language);
	const reviewed = config.tasks.filter((item) => checked[item.id]).length;
	const reset = () => {
		setAnswers({});
		setChecked({});
		setIndex(0);
	};
	return (
		<Frame title={config.title}>
			<p>
				{m.learner_build_one_record_at_a_time_using_the_supplied_names_and_values_check_your_answer_read_the_expla(
					{},
					{ locale: language },
				)}
			</p>
			<Progress
				aria-label={m.learner_records_reviewed({}, { locale: language })}
				value={(reviewed / config.tasks.length) * 100}
			/>
			<p
				ref={heading}
				tabIndex={-1}
				className="text-xl font-semibold tabular-nums"
			>
				{m.learner_task_number(
					{ index: index + 1, total: config.tasks.length },
					{ locale: language },
				)}
			</p>
			<fieldset key={task.id} className="grid gap-4 min-w-0 practice-fields">
				<legend className="max-w-full px-1 font-semibold [overflow-wrap:anywhere]">
					{task.prompt}
				</legend>
				<div className="grid gap-2">
					<Label htmlFor={`${prefix}-owner`}>Owner name</Label>
					<Input
						id={`${prefix}-owner`}
						autoComplete="off"
						value={answer.owner}
						onChange={(e) => update("owner", e.target.value)}
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${prefix}-type`}>Record type</Label>
					<NativeSelect
						id={`${prefix}-type`}
						value={answer.type}
						onChange={(e) => update("type", e.target.value)}
					>
						<NativeSelectOption value="">
							{m.learner_choose_a_type({}, { locale: language })}
						</NativeSelectOption>
						{recordTypes.map((type) => (
							<NativeSelectOption key={type} value={type}>
								{type}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</div>
				<div className="grid gap-2">
					<Label htmlFor={`${prefix}-value`}>Record value</Label>
					<Input
						id={`${prefix}-value`}
						autoComplete="off"
						value={answer.value}
						onChange={(e) => update("value", e.target.value)}
					/>
				</div>
				{answer.type === "MX" && (
					<div className="grid gap-2">
						<Label htmlFor={`${prefix}-preference`}>Mail preference</Label>
						<Input
							id={`${prefix}-preference`}
							type="number"
							min={0}
							max={65535}
							value={answer.preference}
							onChange={(e) => update("preference", e.target.value)}
						/>
					</div>
				)}
				<p className="text-muted-foreground">
					{m.learner_task_hint({ hint: task.hint }, { locale: language })}
				</p>
				<Button
					className="justify-self-start"
					disabled={!complete}
					onClick={() => setChecked({ ...checked, [task.id]: true })}
				>
					{m.learner_check_answer({}, { locale: language })}
				</Button>
				<Feedback active={Boolean(checked[task.id])}>
					{feedback.length
						? feedback.join(" ")
						: m.learner_correct({}, { locale: language })}{" "}
					{task.explanation}
				</Feedback>
			</fieldset>
			<div className="flex flex-wrap gap-3">
				<Button
					variant="outline"
					disabled={index === 0}
					onClick={() => setIndex(index - 1)}
				>
					{m.learner_previous_task({}, { locale: language })}
				</Button>
				<Button
					variant="outline"
					disabled={!checked[task.id] || index === config.tasks.length - 1}
					onClick={() => setIndex(index + 1)}
				>
					{m.learner_next_task({}, { locale: language })}
				</Button>
				<Button variant="outline" onClick={reset}>
					{m.learner_reset_records({}, { locale: language })}
				</Button>
			</div>
			<Feedback active={reviewed === config.tasks.length}>
				{m.learner_record_score(
					{
						correct: config.tasks.filter(
							(item) =>
								recordFeedback(item, answers[item.id] ?? empty, language)
									.length === 0,
						).length,
						total: config.tasks.length,
					},
					{ locale: language },
				)}
			</Feedback>
		</Frame>
	);
}

function CachePractice({ config }: { config: CacheConfig }) {
	const language = useContext(LessonLanguage);
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
				{m.learner_cache_setup(
					{
						name: config.queryName,
						initial: config.initialAddress,
						ttl: config.ttlSeconds,
						changeAt: config.changeAt,
						updated: config.updatedAddress,
					},
					{ locale: language },
				)}
			</p>
			<p>{m.learner_cache_instructions({}, { locale: language })}</p>
			<Progress
				aria-label={m.learner_cache_predictions_reviewed(
					{},
					{ locale: language },
				)}
				value={((index + (checked ? 1 : 0)) / results.length) * 100}
			/>
			<p className="text-xl font-semibold tabular-nums">
				{m.learner_cache_query(
					{ index: index + 1, total: results.length, time: current.time },
					{ locale: language },
				)}
			</p>
			<div className="grid gap-2">
				<Label htmlFor={`${prefix}-address`}>
					{m.learner_predicted_ipv4_answer({}, { locale: language })}
				</Label>
				<Input
					id={`${prefix}-address`}
					value={address}
					autoComplete="off"
					onChange={(e) => {
						setAddress(e.target.value);
						setChecked(false);
					}}
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor={`${prefix}-ttl`}>
					{m.learner_remaining_ttl_after_the_query_seconds(
						{},
						{ locale: language },
					)}
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
			</div>
			<Button
				className="justify-self-start"
				disabled={!address.trim() || !valid}
				onClick={() => setChecked(true)}
			>
				{m.learner_check_prediction({}, { locale: language })}
			</Button>
			<Feedback active={checked}>
				{address.trim() === current.address && Number(ttl) === current.ttl
					? m.learner_correct({}, { locale: language })
					: m.learner_not_quite({}, { locale: language })}{" "}
				{m.learner_cache_result(
					{
						address: current.address,
						ttl: current.ttl,
						authoritative: current.authoritative,
					},
					{ locale: language },
				)}{" "}
				{current.refreshed
					? m.learner_the_previous_entry_expired_this_query_fetched_the_current_authoritative_answer_and_started_a_ne(
							{},
							{ locale: language },
						)
					: m.learner_the_existing_cache_entry_is_still_valid_in_this_model_changing_the_authority_does_not_replace_i(
							{},
							{ locale: language },
						)}
			</Feedback>
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
					{m.learner_next_query({}, { locale: language })}
				</Button>
				<Button variant="outline" onClick={reset}>
					{m.learner_reset_timeline({}, { locale: language })}
				</Button>
			</div>
			{checked && index === results.length - 1 && (
				<p>
					{m.learner_timeline_reviewed_a_successful_refresh_starts_a_new_ttl_changing_an_authoritative_record_alone_(
						{},
						{ locale: language },
					)}
				</p>
			)}
		</Frame>
	);
}
