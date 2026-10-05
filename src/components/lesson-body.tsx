import {
	lessonSections,
	type ReadingSection,
	resourceLabel,
} from "../lib/lesson-copy";
import type { Lesson } from "../server/contracts";
import { LessonActivity } from "./lesson-activity";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";

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
		<>
			<p className="lead">{lesson.description}</p>
			{reading.length > 0 && (
				<article
					className="lesson-content lesson-copy"
					aria-label="Lesson reading"
				>
					{reading.map((section) => (
						<ReadingBlock key={section.id} section={section} />
					))}
				</article>
			)}
			<LessonActivity
				key={`${lesson.activity}-${lesson.activityConfig}`}
				lesson={lesson}
			/>
			{answers.length > 0 && (
				<section className="lesson-content lesson-copy">
					<h2>Check your written answers</h2>
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
						<ReadingBlock key={section.id} section={section} />
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
									className="break-words [text-decoration-line:underline] underline-offset-4 decoration-from-font"
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
		</>
	);
}

function ReadingBlock({ section }: { section: ReadingSection }) {
	return (
		<section className="grid grid-cols-1 gap-4 min-w-0">
			{section.heading && <h2>{section.heading}</h2>}
			<Paragraphs section={section} />
		</section>
	);
}

function Paragraphs({ section }: { section: ReadingSection }) {
	const occurrences = new Map<string, number>();
	return section.paragraphs.map((paragraph) => {
		const occurrence = (occurrences.get(paragraph) ?? 0) + 1;
		occurrences.set(paragraph, occurrence);
		return (
			<p
				key={`${section.id}-${paragraph}-${occurrence}`}
				className="whitespace-pre-wrap"
			>
				{paragraph}
			</p>
		);
	});
}
