import {
	type ReactNode,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
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
import { AppLink } from "./app-link";
import { IPAddressLab } from "./ip-address-lab";
import { LessonLanguage, useLessonCopy } from "./lesson-language";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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

function Frame({ title, children }: { title: string; children: ReactNode }) {
	const c = useLessonCopy();
	return (
		<Card
			className="lesson-practice my-8 min-w-0"
			data-testid="lesson-activity"
		>
			<CardHeader>
				<Badge variant="secondary" className="w-fit">
					{c("Interactive practice", "Latihan interaktif")}
				</Badge>
				<CardTitle className="text-xl">
					<h2>{title}</h2>
				</CardTitle>
				<p className="text-muted-foreground">
					{c(
						"Safe, offline practice. Try, check and retry. Answers reset when you reload; saved lesson completion is separate.",
						"Latihan offline yang selamat. Cuba, semak dan cuba semula. Jawapan ditetapkan semula apabila halaman dimuat semula; penyelesaian pelajaran disimpan secara berasingan.",
					)}
				</p>
			</CardHeader>
			<CardContent className="grid gap-6 min-w-0">{children}</CardContent>
		</Card>
	);
}
function Feedback({
	active,
	children,
}: {
	active: boolean;
	children: ReactNode;
}) {
	return (
		<div role="status" className={active ? undefined : "sr-only"}>
			{active && (
				<Alert role="presentation">
					<AlertDescription className="text-base break-words">
						{children}
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}

export function LessonActivity({
	lesson,
	reviewLessons = [],
}: {
	lesson: Pick<Lesson, "activity" | "activityConfig" | "lessonType">;
	reviewLessons?: readonly ReviewLesson[];
}) {
	const c = useLessonCopy();
	if (lesson.activityConfig) {
		const config = parseActivity(lesson.activityConfig);
		if (!config)
			return (
				<Alert variant="destructive">
					<AlertDescription>
						{c(
							"This practice is not configured correctly. Please contact the course author.",
							"Konfigurasi latihan ini tidak betul. Sila hubungi penulis kursus.",
						)}
					</AlertDescription>
				</Alert>
			);
		switch (config.kind) {
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
	const c = useLessonCopy();
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
				{c(
					"Choose one answer, check the explanation, then continue. You can go back and retry. Answers reset if you leave this lesson or reload.",
					"Pilih satu jawapan, semak penerangan, kemudian teruskan. Anda boleh kembali dan cuba semula. Jawapan ditetapkan semula jika anda meninggalkan pelajaran ini atau memuat semula halaman.",
				)}
			</p>
			<p className="text-muted-foreground">
				{c(
					"Practice only. Your score does not control lesson completion.",
					"Latihan sahaja. Skor anda tidak menentukan penyelesaian pelajaran.",
				)}
			</p>
			<Progress
				aria-label={c("Questions answered", "Soalan dijawab")}
				value={(answered / config.questions.length) * 100}
			/>
			<p
				ref={heading}
				tabIndex={-1}
				className="text-xl font-semibold tabular-nums"
			>
				{c("Question", "Soalan")} {index + 1} {c("of", "daripada")}{" "}
				{config.questions.length}
			</p>
			<fieldset
				key={question.id}
				className="grid gap-4 min-w-0 rounded-lg border p-4"
			>
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
				<Feedback active={Boolean(checked[question.id])}>
					{results[index].correct
						? c("Correct.", "Betul.")
						: c("Not quite.", "Belum tepat.")}{" "}
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
						{c(
							`Review lesson: ${review.title}`,
							`Ulang kaji pelajaran: ${review.title}`,
						)}
					</Button>
				)}
			</fieldset>
			<div className="flex flex-wrap gap-3">
				<Button
					disabled={!complete}
					onClick={() => setChecked({ ...checked, [question.id]: true })}
				>
					{c("Check answer", "Semak jawapan")}
				</Button>
				<Button
					variant="outline"
					disabled={index === 0}
					onClick={() => setIndex(index - 1)}
				>
					{c("Previous question", "Soalan sebelumnya")}
				</Button>
				<Button
					variant="outline"
					disabled={
						!checked[question.id] || index === config.questions.length - 1
					}
					onClick={() => setIndex(index + 1)}
				>
					{c("Next question", "Soalan seterusnya")}
				</Button>
				<Button
					variant="outline"
					onClick={() => {
						setAnswers({});
						setChecked({});
						setIndex(0);
					}}
				>
					{c("Reset quiz", "Set semula quiz")}
				</Button>
			</div>
			<Feedback active={config.questions.every((item) => checked[item.id])}>
				{c("You scored", "Skor anda ialah")}{" "}
				{results.filter((result) => result.correct).length}{" "}
				{c("out of", "daripada")} {config.questions.length}.{" "}
				{c(
					"Review the explanations, then try again. Lesson completion is separate.",
					"Baca semula penerangan, kemudian cuba lagi. Penyelesaian pelajaran disimpan secara berasingan.",
				)}
			</Feedback>
		</Frame>
	);
}

function ResolutionPractice({ config }: { config: TraceConfig }) {
	const c = useLessonCopy();
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
				{c(
					"Predict each next step for the A lookup of",
					"Ramalkan setiap langkah seterusnya bagi A lookup untuk",
				)}{" "}
				<strong className="break-all">{config.queryName}</strong>.{" "}
				{c(
					"A referral tells the resolver where to ask next; it is not the requested address.",
					"Referral memberitahu resolver tempat untuk bertanya seterusnya; ia bukan address yang diminta.",
				)}
			</p>
			<p className="text-muted-foreground">
				{c(
					"Each stage combines a query and its reply. Choose who is asked, then the result of that stage. TLD means top-level domain, such as com.",
					"Setiap langkah menggabungkan query dan reply. Pilih pihak yang ditanya, kemudian hasil langkah itu. TLD bermaksud top-level domain, seperti com.",
				)}
			</p>
			<Label htmlFor={`${prefix}-mode`}>{c("Cache mode", "Mod cache")}</Label>
			<Select
				items={[
					{
						value: "cold",
						label: c(
							"Cold: no useful cached data",
							"Cold: tiada cached data yang berguna",
						),
					},
					{
						value: "warm",
						label: c(
							"Warm: valid cached A answer",
							"Warm: cached A answer masih sah",
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
						{c(
							"Cold: no useful cached data",
							"Cold: tiada cached data yang berguna",
						)}
					</SelectItem>
					<SelectItem value="warm">
						{c(
							"Warm: valid cached A answer",
							"Warm: cached A answer masih sah",
						)}
					</SelectItem>
				</SelectContent>
			</Select>
			<Progress
				aria-label={c("Lookup steps reviewed", "Langkah lookup disemak")}
				value={((index + (checked ? 1 : 0)) / steps.length) * 100}
			/>
			<p className="font-semibold tabular-nums">
				{c("Step", "Langkah")} {index + 1} {c("of", "daripada")} {steps.length}:{" "}
				{label(step.from)}
			</p>
			<Label htmlFor={`${prefix}-target`}>
				{c(
					"Who receives the next message?",
					"Siapakah yang menerima mesej seterusnya?",
				)}
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
					{c("Choose a role", "Pilih role")}
				</NativeSelectOption>
				{config.roles.map((r) => (
					<NativeSelectOption key={r.id} value={r.id}>
						{r.label}
					</NativeSelectOption>
				))}
			</NativeSelect>
			<Label htmlFor={`${prefix}-result`}>
				{c("What is the result of this step?", "Apakah hasil langkah ini?")}
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
					{c("Choose a result", "Pilih hasil")}
				</NativeSelectOption>
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
				{c("Check step", "Semak langkah")}
			</Button>
			<Feedback active={checked}>
				{target === step.to && result === step.result
					? c("Correct.", "Betul.")
					: c("Not quite.", "Belum tepat.")}{" "}
				{target !== step.to
					? c(
							`Check who receives the query from ${label(step.from)}. `,
							`Semak pihak yang menerima query daripada ${label(step.from)}. `,
						)
					: result !== step.result
						? c(
								"The recipient is right. Check whether this stage gives a referral or the requested answer. ",
								"Penerima betul. Semak sama ada langkah ini memberikan referral atau answer yang diminta. ",
							)
						: ""}
				{label(step.from)} → {label(step.to)}. {c("Result", "Hasil")}:{" "}
				{step.result}. {step.explanation}
				{step.result === "answer"
					? c(
							` The fictional A answer is ${config.address}.`,
							` A answer rekaan ialah ${config.address}.`,
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
					{c("Next step", "Langkah seterusnya")}
				</Button>
				<Button variant="outline" onClick={reset}>
					{c("Reset lookup", "Set semula lookup")}
				</Button>
			</div>
			{checked && index === steps.length - 1 && (
				<p>
					{c(
						"Trace reviewed. Compare cold and warm mode to see which outside queries were skipped. This model omits forwarding, query-name minimisation and name-server address discovery.",
						"Walkthrough disemak. Bandingkan mod cold dan warm untuk melihat query luar yang tidak diperlukan. Model ini tidak merangkumi forwarding, query-name minimisation atau name-server address discovery.",
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
	const c = useLessonCopy();
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
				{c(
					"Build one record at a time using the supplied names and values. Check your answer, read the explanation, then move on. These are exercise cards, not a deployable zone.",
					"Bina satu record pada satu masa menggunakan name dan value yang diberikan. Semak jawapan, baca penerangan, kemudian teruskan. Ini ialah kad latihan, bukan zone yang boleh digunakan terus.",
				)}
			</p>
			<Progress
				aria-label={c("Records reviewed", "Record disemak")}
				value={(reviewed / config.tasks.length) * 100}
			/>
			<p
				ref={heading}
				tabIndex={-1}
				className="text-xl font-semibold tabular-nums"
			>
				{c("Task", "Tugasan")} {index + 1} {c("of", "daripada")}{" "}
				{config.tasks.length}
			</p>
			<fieldset
				key={task.id}
				className="grid gap-3 min-w-0 rounded-lg border p-4"
			>
				<legend className="max-w-full px-1 font-semibold [overflow-wrap:anywhere]">
					{task.prompt}
				</legend>
				<Label htmlFor={`${prefix}-owner`}>Owner name</Label>
				<Input
					id={`${prefix}-owner`}
					autoComplete="off"
					value={answer.owner}
					onChange={(e) => update("owner", e.target.value)}
				/>
				<Label htmlFor={`${prefix}-type`}>Record type</Label>
				<NativeSelect
					id={`${prefix}-type`}
					value={answer.type}
					onChange={(e) => update("type", e.target.value)}
				>
					<NativeSelectOption value="">
						{c("Choose a type", "Pilih type")}
					</NativeSelectOption>
					{recordTypes.map((type) => (
						<NativeSelectOption key={type} value={type}>
							{type}
						</NativeSelectOption>
					))}
				</NativeSelect>
				<Label htmlFor={`${prefix}-value`}>Record value</Label>
				<Input
					id={`${prefix}-value`}
					autoComplete="off"
					value={answer.value}
					onChange={(e) => update("value", e.target.value)}
				/>
				{answer.type === "MX" && (
					<>
						<Label htmlFor={`${prefix}-preference`}>Mail preference</Label>
						<Input
							id={`${prefix}-preference`}
							type="number"
							min={0}
							max={65535}
							value={answer.preference}
							onChange={(e) => update("preference", e.target.value)}
						/>
					</>
				)}
				<p className="text-muted-foreground">
					{c("Hint", "Petunjuk")}: {task.hint}
				</p>
				<Feedback active={Boolean(checked[task.id])}>
					{feedback.length ? feedback.join(" ") : c("Correct.", "Betul.")}{" "}
					{task.explanation}
				</Feedback>
			</fieldset>
			<div className="flex flex-wrap gap-3">
				<Button
					disabled={!complete}
					onClick={() => setChecked({ ...checked, [task.id]: true })}
				>
					{c("Check answer", "Semak jawapan")}
				</Button>
				<Button
					variant="outline"
					disabled={index === 0}
					onClick={() => setIndex(index - 1)}
				>
					{c("Previous task", "Tugasan sebelumnya")}
				</Button>
				<Button
					variant="outline"
					disabled={!checked[task.id] || index === config.tasks.length - 1}
					onClick={() => setIndex(index + 1)}
				>
					{c("Next task", "Tugasan seterusnya")}
				</Button>
				<Button variant="outline" onClick={reset}>
					{c("Reset records", "Set semula record")}
				</Button>
			</div>
			<Feedback active={reviewed === config.tasks.length}>
				{
					config.tasks.filter(
						(item) =>
							recordFeedback(item, answers[item.id] ?? empty, language)
								.length === 0,
					).length
				}{" "}
				{c("of", "daripada")} {config.tasks.length}{" "}
				{c(
					"records match their jobs. You can revisit any task and retry. Lesson completion is separate.",
					"record sepadan dengan kegunaannya. Anda boleh kembali ke mana-mana tugasan dan cuba semula. Penyelesaian pelajaran disimpan secara berasingan.",
				)}
			</Feedback>
		</Frame>
	);
}

function CachePractice({ config }: { config: CacheConfig }) {
	const c = useLessonCopy();
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
				{c("The resolver stores", "Resolver menyimpan")}{" "}
				<strong className="break-all">{config.queryName}</strong>{" "}
				{c("as", "sebagai")} {config.initialAddress} {c("at", "pada")} t=0,{" "}
				{c("with TTL", "dengan TTL")} {config.ttlSeconds}{" "}
				{c("seconds. At", "saat. Pada")} t={config.changeAt},{" "}
				{c("the authority changes it to", "authority menukarnya kepada")}{" "}
				{config.updatedAddress}.{" "}
				{c(
					"There is no early eviction, prefetch or stale-answer serving.",
					"Tiada early eviction, prefetch atau stale-answer serving dalam model ini.",
				)}
			</p>
			<p>
				{c(
					"Use virtual time—no real waiting. Predict the answer",
					"Gunakan masa simulasi—tidak perlu menunggu. Ramalkan jawapan",
				)}{" "}
				<strong>{c("after", "selepas")}</strong>{" "}
				{c(
					"each query. Expiry is processed before a query at the exact expiry time.",
					"setiap query. Pada masa expiry yang tepat, expiry diproses sebelum query.",
				)}
			</p>
			<Progress
				aria-label={c("Cache predictions reviewed", "Ramalan cache disemak")}
				value={((index + (checked ? 1 : 0)) / results.length) * 100}
			/>
			<p className="text-xl font-semibold tabular-nums">
				Query {index + 1} {c("of", "daripada")} {results.length}: t=
				{current.time} {c("seconds", "saat")}
			</p>
			<Label htmlFor={`${prefix}-address`}>
				{c("Predicted IPv4 answer", "Ramalan IPv4 answer")}
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
			<Label htmlFor={`${prefix}-ttl`}>
				{c(
					"Remaining TTL after the query (seconds)",
					"Baki TTL selepas query (saat)",
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
			<Button
				className="justify-self-start"
				disabled={!address.trim() || !valid}
				onClick={() => setChecked(true)}
			>
				{c("Check prediction", "Semak ramalan")}
			</Button>
			<Feedback active={checked}>
				{address.trim() === current.address && Number(ttl) === current.ttl
					? c("Correct.", "Betul.")
					: c("Not quite.", "Belum tepat.")}{" "}
				Cached answer: {current.address}. {c("Remaining TTL", "Baki TTL")}:{" "}
				{current.ttl} {c("seconds", "saat")}. Authoritative answer:{" "}
				{current.authoritative}.{" "}
				{current.refreshed
					? c(
							"The previous entry expired. This query fetched the current authoritative answer and started a new TTL.",
							"Entry sebelumnya telah expired. Query ini mendapatkan authoritative answer semasa dan memulakan TTL baharu.",
						)
					: c(
							"The existing cache entry is still valid in this model; changing the authority does not replace it.",
							"Cache entry sedia ada masih sah dalam model ini; perubahan pada authority tidak menggantikannya.",
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
					{c("Next query", "Query seterusnya")}
				</Button>
				<Button variant="outline" onClick={reset}>
					{c("Reset timeline", "Set semula timeline")}
				</Button>
			</div>
			{checked && index === results.length - 1 && (
				<p>
					{c(
						"Timeline reviewed. A successful refresh starts a new TTL; changing an authoritative record alone does not. Reset to replay from t=0.",
						"Timeline disemak. Refresh yang berjaya memulakan TTL baharu; mengubah authoritative record sahaja tidak memulakannya. Set semula untuk bermula dari t=0.",
					)}
				</p>
			)}
		</Frame>
	);
}
