import {
	ArrowDown,
	BookOpen,
	CheckCheck,
	FlaskConical,
	Lightbulb,
} from "lucide-react";
import { useId } from "react";
import { type ContentLanguage, learningHeading } from "../lib/learning-text";
import {
	fencedCode,
	lessonSections,
	type ReadingSection,
	resourceLabel,
} from "../lib/lesson-copy";
import * as m from "../paraglide/messages.js";
import type { Lesson } from "../server/contracts";
import { LessonActivity, type ReviewLesson } from "./lesson-activity";
import { InlineCode, LessonCode } from "./lesson-code";
import { LessonLanguage } from "./lesson-language";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

/** The same content and practice rendering is used in Studio and learning. */
export function LessonBody({
	lesson,
	reviewLessons,
	language = "en",
}: {
	lesson: Pick<
		Lesson,
		| "description"
		| "content"
		| "resourceLinks"
		| "activity"
		| "activityConfig"
		| "lessonType"
	>;
	reviewLessons?: readonly ReviewLesson[];
	language?: ContentLanguage;
}) {
	return (
		<LessonLanguage.Provider value={language}>
			<LocalizedLessonBody
				lesson={lesson}
				reviewLessons={reviewLessons}
				language={language}
			/>
		</LessonLanguage.Provider>
	);
}
function LocalizedLessonBody({
	lesson,
	reviewLessons,
	language,
}: Parameters<typeof LessonBody>[0] & { language: ContentLanguage }) {
	const id = useId();
	const sections = lessonSections(lesson.content);
	const reading = sections.filter(
		(section) =>
			section.heading !== "Recap" &&
			section.heading !== "Next step" &&
			section.heading !== "Self-check — read after practising",
	);
	const recap = sections.filter(
		(section) => section.heading === "Recap" || section.heading === "Next step",
	);
	const answers = sections.filter(
		(section) => section.heading === "Self-check — read after practising",
	);
	const hasActivity = Boolean(lesson.activity || lesson.activityConfig);
	const sectionId = (section: ReadingSection) => `${id}-section-${section.id}`;
	const writtenPractice = reading.find(
		(section) => section.heading === "Practice",
	);
	const practiceId = hasActivity
		? `${id}-activity`
		: writtenPractice
			? sectionId(writtenPractice)
			: null;
	const stops = [
		...reading.map((section) => ({
			id: sectionId(section),
			title: learningHeading(section.heading ?? "Lesson notes", language),
		})),
		...(hasActivity
			? [
					{
						id: `${id}-activity`,
						title: m.learner_interactive_practice({}, { locale: language }),
					},
				]
			: []),
		...(answers.length
			? [
					{
						id: `${id}-answers`,
						title: m.learner_self_check({}, { locale: language }),
					},
				]
			: []),
		...recap.map((section) => ({
			id: sectionId(section),
			title: learningHeading(section.heading ?? "Recap", language),
		})),
	];
	function jumpTo(targetId: string) {
		const target = document.getElementById(targetId);
		target?.scrollIntoView({ block: "start", behavior: "instant" });
		target?.focus({ preventScroll: true });
	}
	const links = lesson.resourceLinks
		.split("\n")
		.map((link) => link.trim())
		.filter((link) => {
			try {
				return new URL(link).protocol === "https:";
			} catch {
				return false;
			}
		});
	return (
		<div className="grid min-w-0 gap-8">
			<p className="lead">{lesson.description}</p>
			{stops.length > 1 && (
				<Card className="gap-4 bg-muted py-5 ring-0">
					<CardHeader className="gap-2">
						<p className="font-semibold text-base">
							{m.learner_in_this_lesson({}, { locale: language })}
						</p>
						<p className="text-base text-muted-foreground">
							{m.learner_follow_the_sections_below_or_jump_to_the_part_you_need(
								{},
								{ locale: language },
							)}
						</p>
					</CardHeader>
					<CardContent className="gap-4">
						<nav
							aria-label={m.learner_lesson_sections({}, { locale: language })}
							className="flex flex-wrap gap-3"
						>
							{stops.map((stop, index) => (
								<Button
									key={stop.id}
									variant="outline"
									className="h-auto min-h-11 max-w-full whitespace-normal text-start"
									aria-controls={stop.id}
									onClick={() => jumpTo(stop.id)}
								>
									<span
										className="tabular-nums text-muted-foreground"
										aria-hidden="true"
									>
										{index + 1}.
									</span>
									{stop.title}
								</Button>
							))}
						</nav>
						{practiceId && (
							<Button
								variant="outline"
								className="min-h-11 self-start"
								onClick={() => jumpTo(practiceId)}
							>
								<FlaskConical aria-hidden="true" />
								{m.learner_jump_to_practice({}, { locale: language })}
								<ArrowDown aria-hidden="true" />
							</Button>
						)}
					</CardContent>
				</Card>
			)}
			{reading.length > 0 && (
				<article
					className="lesson-content lesson-copy"
					aria-label={m.learner_lesson_reading({}, { locale: language })}
				>
					{reading.map((section) => (
						<ReadingBlock
							key={section.id}
							section={section}
							language={language}
							id={sectionId(section)}
							number={
								stops.findIndex((stop) => stop.id === sectionId(section)) + 1
							}
						/>
					))}
				</article>
			)}
			{hasActivity && (
				<section
					id={`${id}-activity`}
					tabIndex={-1}
					aria-label={m.learner_interactive_practice({}, { locale: language })}
					className="min-w-0 scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
				>
					<LessonActivity
						reviewLessons={reviewLessons}
						key={`${lesson.activity}-${lesson.activityConfig}`}
						lesson={lesson}
					/>
				</section>
			)}
			{answers.length > 0 && (
				<section
					id={`${id}-answers`}
					tabIndex={-1}
					aria-labelledby={`${id}-answers-title`}
					className="lesson-content lesson-copy scroll-mt-24 rounded-xl bg-muted p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<h2 id={`${id}-answers-title`}>
						{m.learner_check_your_written_answers({}, { locale: language })}
					</h2>
					<p>
						{m.learner_try_the_practice_first_then_reveal_the_answers_your_written_responses_are_not_saved(
							{},
							{ locale: language },
						)}
					</p>
					<Accordion key={lesson.content}>
						<AccordionItem value="answers">
							<AccordionTrigger className="text-base min-h-11">
								{m.learner_reveal_self_check_answers({}, { locale: language })}
							</AccordionTrigger>
							<AccordionContent className="[font-size:var(--type-reading)] leading-[1.6]">
								{answers.map((section) => (
									<Paragraphs key={section.id} section={section} />
								))}
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</section>
			)}
			{recap.length > 0 && (
				<article
					className="lesson-content lesson-copy"
					aria-label={m.learner_lesson_recap({}, { locale: language })}
				>
					{recap.map((section) => (
						<ReadingBlock
							key={section.id}
							section={section}
							language={language}
							id={sectionId(section)}
							number={
								stops.findIndex((stop) => stop.id === sectionId(section)) + 1
							}
						/>
					))}
				</article>
			)}
			{links.length > 0 && (
				<aside
					className="mt-6 min-w-0"
					aria-label={m.learner_learning_resources({}, { locale: language })}
				>
					<h2 className="text-xl text-balance">
						{m.learner_learning_resources({}, { locale: language })}
					</h2>
					<p className="mt-2 text-muted-foreground">
						{m.learner_optional_reference_reading_links_open_in_a_new_tab(
							{},
							{ locale: language },
						)}
					</p>
					<ul className="mt-4 grid gap-3">
						{links.map((link) => (
							<li key={link}>
								<a
									className="break-words"
									href={link}
									target="_blank"
									rel="noopener noreferrer"
								>
									{resourceLabel(link)}
								</a>
							</li>
						))}
					</ul>
				</aside>
			)}
		</div>
	);
}

function ReadingBlock({
	section,
	id,
	number,
	language,
}: {
	section: ReadingSection;
	id: string;
	number: number;
	language: ContentLanguage;
}) {
	const example = section.heading === "Worked example";
	const practice = section.heading === "Practice";
	const recap = section.heading === "Recap" || section.heading === "Next step";
	const Icon = example
		? Lightbulb
		: practice
			? FlaskConical
			: recap
				? CheckCheck
				: BookOpen;
	return (
		<section
			id={id}
			tabIndex={-1}
			aria-labelledby={`${id}-title`}
			className="min-w-0 scroll-mt-24 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<Card
				data-reading-kind={
					practice
						? "practice"
						: example
							? "example"
							: recap
								? "recap"
								: "explain"
				}
				className={`gap-4 py-5 shadow-none ring-0 ${practice ? "bg-accent text-accent-foreground border-s-4 border-primary" : example ? "bg-muted text-foreground" : recap ? "bg-muted/50 text-foreground" : "bg-transparent text-foreground"}`}
			>
				<CardHeader>
					<div className="flex items-center gap-3">
						<span
							aria-hidden="true"
							className="flex size-10 shrink-0 items-center justify-center text-foreground"
						>
							<Icon className="size-5" strokeWidth={2} />
						</span>
						<div className="min-w-0">
							<p className="text-sm font-medium text-muted-foreground">
								{m.learner_section_number({ number }, { locale: language })}
							</p>
							<h2 id={`${id}-title`}>
								{learningHeading(section.heading ?? "Lesson notes", language)}
							</h2>
							{(example || practice) && (
								<p className="!text-base text-muted-foreground">
									{example
										? m.lesson_example_guidance({}, { locale: language })
										: m.lesson_practice_guidance({}, { locale: language })}
								</p>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent className="gap-4 [font-size:var(--type-reading)] leading-[1.6]">
					<Paragraphs section={section} />
				</CardContent>
			</Card>
		</section>
	);
}

function Paragraphs({ section }: { section: ReadingSection }) {
	const occurrences = new Map<string, number>();
	return section.paragraphs.map((paragraph) => {
		const occurrence = (occurrences.get(paragraph) ?? 0) + 1;
		occurrences.set(paragraph, occurrence);
		const code = fencedCode(paragraph);
		if (code)
			return (
				<LessonCode
					key={`${section.id}-${paragraph}-${occurrence}`}
					{...code}
				/>
			);
		return (
			<p
				key={`${section.id}-${paragraph}-${occurrence}`}
				className="whitespace-pre-wrap"
			>
				<InlineCode text={paragraph} />
			</p>
		);
	});
}
