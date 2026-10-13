import { useState } from "react";
import { lessonIssues } from "../../lib/lesson-readiness";
import { youtubeId } from "../../lib/youtube";
import * as m from "../../paraglide/messages.js";
import type { LessonInput } from "../../server/contracts";
import { LessonBody } from "../lesson-body";
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
import { studioDisplayMessage } from "./common";

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
					<p>{m.studio_before_publish()}</p>
					{issues.length ? (
						<ul>
							{issues.map((issue) => (
								<li key={issue}>{studioDisplayMessage(issue)}</li>
							))}
						</ul>
					) : (
						<p>{m.studio_lesson_ready()}</p>
					)}
				</AlertDescription>
			</Alert>
			<Button type="button" variant="outline" onClick={() => setOpen(true)}>
				{m.studio_preview_lesson()}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-4xl max-h-[85dvh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{lesson.title || m.studio_untitled()}</DialogTitle>
						<DialogDescription>{m.studio_preview_help()}</DialogDescription>
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
						<LessonBody lesson={lesson} />
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
