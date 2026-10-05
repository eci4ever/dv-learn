import {
	BookOpenIcon,
	CheckIcon,
	ListIcon,
	LockIcon,
	PlayIcon,
} from "lucide-react";
import { useState } from "react";
import type { LessonResponse } from "../server/contracts";
import { AppLink } from "./app-link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./ui/sheet";

export function LearningOutline({ data }: { data: LessonResponse }) {
	const [open, setOpen] = useState(false);
	const lessons = data.sections.flatMap((section) => section.lessons);
	const completed = new Set(data.completedLessonIds);
	const count = lessons.filter((lesson) => completed.has(lesson.id)).length;
	function content(onNavigate?: () => void) {
		return (
			<div className="grid gap-6">
				{data.hasAccess ? (
					<div className="grid gap-2">
						<p className="text-muted-foreground">
							{count} of {lessons.length} lessons complete
						</p>
						<Progress
							aria-label="Course progress"
							value={lessons.length ? (count / lessons.length) * 100 : 0}
						/>
					</div>
				) : (
					<p className="text-muted-foreground">
						Preview lessons are free to try. Get course access to save your
						progress.
					</p>
				)}
				<nav aria-label="Course lessons" className="grid gap-6">
					{data.sections.map((section) => (
						<div key={section.id} className="grid gap-2">
							<h3 className="font-semibold">{section.title}</h3>
							{section.lessons.map((lesson) => {
								const locked = !data.hasAccess && !lesson.preview;
								const current = lesson.id === data.lesson.id;
								const Icon = locked
									? LockIcon
									: completed.has(lesson.id)
										? CheckIcon
										: lesson.lessonType === "video"
											? PlayIcon
											: BookOpenIcon;
								return (
									<AppLink
										key={lesson.id}
										href={
											locked
												? `/courses/${data.course.slug}`
												: `/learn/${data.course.slug}/${lesson.id}`
										}
										onClick={onNavigate}
										aria-current={current ? "page" : undefined}
										className={`flex min-h-11 items-start gap-3 rounded-lg p-3 ${current ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
									>
										<Icon aria-hidden="true" className="mt-1 size-4 shrink-0" />
										<span className="min-w-0 flex-1 break-words">
											{lesson.title}
											<span className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
												{completed.has(lesson.id) && <span>Completed</span>}
												{locked && <span>Course access required</span>}
												{lesson.preview && (
													<Badge variant="secondary">Preview</Badge>
												)}
												{lesson.durationSeconds > 0 && (
													<span>
														{Math.ceil(lesson.durationSeconds / 60)} min
													</span>
												)}
											</span>
										</span>
									</AppLink>
								);
							})}
						</div>
					))}
				</nav>
			</div>
		);
	}
	return (
		<>
			<div className="learning-mobile-outline mb-6">
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetTrigger
						render={<Button variant="outline" className="min-h-11 text-base" />}
					>
						<ListIcon aria-hidden="true" />
						Course content
					</SheetTrigger>
					<SheetContent className="w-[min(100%,24rem)]! overflow-y-auto text-base">
						<SheetHeader className="pe-12">
							<SheetTitle>Course content</SheetTitle>
							<SheetDescription>{data.course.title}</SheetDescription>
						</SheetHeader>
						<div className="px-4 pb-8">{content(() => setOpen(false))}</div>
					</SheetContent>
				</Sheet>
			</div>
			<div className="learning-desktop-outline self-start min-w-0">
				<Card className="gap-5 p-6">
					<h2 className="text-xl font-semibold">Course content</h2>
					{content()}
				</Card>
			</div>
		</>
	);
}
