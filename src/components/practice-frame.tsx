import { type ReactNode, useContext } from "react";
import * as m from "../paraglide/messages.js";
import { LessonLanguage } from "./lesson-language";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function Frame({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	const language = useContext(LessonLanguage);
	return (
		<Card
			className="lesson-practice min-w-0 border-s-4 border-primary bg-accent/30 shadow-none ring-1 ring-border"
			data-testid="lesson-activity"
		>
			<CardHeader>
				<Badge variant="secondary" className="w-fit">
					{m.learner_interactive_practice({}, { locale: language })}
				</Badge>
				<CardTitle className="text-xl">
					<h2>{title}</h2>
				</CardTitle>
			</CardHeader>
			<CardContent className="practice-workspace grid gap-6 min-w-0">
				{children}
				<p className="text-muted-foreground">
					{m.learner_safe_offline_practice_try_check_and_retry_answers_reset_when_you_reload_saved_lesson_completion(
						{},
						{ locale: language },
					)}
				</p>
			</CardContent>
		</Card>
	);
}

export function Feedback({
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
