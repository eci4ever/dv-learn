import {
	ArrowDown,
	BookOpen,
	CheckCheck,
	FlaskConical,
	Lightbulb,
} from "lucide-react";
import { useId } from "react";
import {
	fencedCode,
	lessonSections,
	type ReadingSection,
	resourceLabel,
} from "../lib/lesson-copy";
import type { Lesson } from "../server/contracts";
import { LessonActivity } from "./lesson-activity";
import { InlineCode, LessonCode } from "./lesson-code";
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
}) {
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
			title: section.heading ?? "Lesson notes",
		})),
		...(hasActivity
			? [{ id: `${id}-activity`, title: "Interactive practice" }]
			: []),
		...(answers.length ? [{ id: `${id}-answers`, title: "Self-check" }] : []),
		...recap.map((section) => ({
			id: sectionId(section),
			title: section.heading ?? "Recap",
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
						<p className="font-semibold text-base">In this lesson</p>
						<p className="text-base text-muted-foreground">
							Follow the sections below, or jump to the part you need.
						</p>
					</CardHeader>
					<CardContent className="gap-4">
						<nav aria-label="Lesson sections" className="flex flex-wrap gap-3">
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
								Jump to practice
								<ArrowDown aria-hidden="true" />
							</Button>
						)}
					</CardContent>
				</Card>
			)}
			{reading.length > 0 && (
				<article
					className="lesson-content lesson-copy"
					aria-label="Lesson reading"
				>
					{reading.map((section) => (
						<ReadingBlock
							key={section.id}
							section={section}
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
					aria-label="Interactive practice"
					className="min-w-0 scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
				>
					<LessonActivity
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
					<h2 id={`${id}-answers-title`}>Check your written answers</h2>
					<p>
						Try the practice first, then reveal the answers. Your written
						responses are not saved.
					</p>
					<Accordion key={lesson.content}>
						<AccordionItem value="answers">
							<AccordionTrigger className="text-base min-h-11">
								Reveal self-check answers
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
					aria-label="Lesson recap"
				>
					{recap.map((section) => (
						<ReadingBlock
							key={section.id}
							section={section}
							id={sectionId(section)}
							number={
								stops.findIndex((stop) => stop.id === sectionId(section)) + 1
							}
						/>
					))}
				</article>
			)}
			{links.length > 0 && (
				<aside className="mt-6 min-w-0" aria-label="Learning resources">
					<h2 className="text-xl text-balance">Learning resources</h2>
					<p className="mt-2 text-muted-foreground">
						Optional reference reading. Links open in a new tab.
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
}: {
	section: ReadingSection;
	id: string;
	number: number;
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
				className={`gap-5 py-5 shadow-none ring-0 ${practice ? "bg-accent text-accent-foreground" : example || recap ? "bg-muted text-foreground" : "bg-card text-card-foreground"}`}
			>
				<CardHeader>
					<div className="flex items-center gap-3">
						<span
							aria-hidden="true"
							className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-foreground"
						>
							<Icon className="size-5" strokeWidth={2} />
						</span>
						<div className="min-w-0">
							<p className="text-sm font-medium text-muted-foreground">
								Section {number}
							</p>
							<h2 id={`${id}-title`}>{section.heading ?? "Lesson notes"}</h2>
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
