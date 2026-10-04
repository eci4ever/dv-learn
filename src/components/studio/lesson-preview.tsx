import { useState } from "react";
import { lessonIssues } from "../../lib/lesson-readiness";
import { youtubeId } from "../../lib/youtube";
import type { LessonInput } from "../../server/contracts";
import { IPAddressLab } from "../ip-address-lab";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { YoutubePlayer } from "../youtube-player";

export function LessonPreview({ lesson }: { lesson: LessonInput }) {
	const [open, setOpen] = useState(false);
	const videoId =
		lesson.lessonType === "video" && lesson.videoUrl
			? youtubeId(lesson.videoUrl)
			: null;
	const issues = lessonIssues(lesson);
	return (
		<>
			<Alert>
				<AlertDescription>
					<p>Before publishing</p>
					{issues.length ? (
						<ul>
							{issues.map((issue) => (
								<li key={issue}>{issue}</li>
							))}
						</ul>
					) : (
						<p>This lesson has the required content.</p>
					)}
				</AlertDescription>
			</Alert>
			<Button type="button" variant="outline" onClick={() => setOpen(true)}>
				Preview lesson
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-4xl max-h-[85dvh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{lesson.title || "Untitled lesson"}</DialogTitle>
						<DialogDescription>
							Admin-only preview of your current edits. Nothing is saved and no
							learning progress is recorded.
						</DialogDescription>
					</DialogHeader>
					<div className="min-w-0 text-base">
						{videoId && (
							<div className="video-frame">
								<YoutubePlayer
									videoId={videoId}
									start={0}
									onProgress={async () => {}}
									onError={() => {}}
								/>
							</div>
						)}
						<p className="lead">{lesson.description}</p>
						<article className="lesson-content">{lesson.content}</article>
						{(lesson.lessonType === "interactive" ||
							lesson.lessonType === "quiz") &&
							lesson.activity && <IPAddressLab mode={lesson.activity} />}
						{lesson.resourceLinks && (
							<div>
								<h3>Learning resources</h3>
								<ul>
									{lesson.resourceLinks
										.split("\n")
										.filter((link) => {
											try {
												return new URL(link.trim()).protocol === "https:";
											} catch {
												return false;
											}
										})
										.map((link) => (
											<li key={link}>
												<a
													href={link.trim()}
													target="_blank"
													rel="noopener noreferrer"
												>
													{link.trim()}
												</a>
											</li>
										))}
								</ul>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
