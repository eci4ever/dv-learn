import { useQuery } from "@tanstack/react-query";
import * as m from "../../paraglide/messages.js";
import { getPublishChecklist } from "../../server/studio";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { QueryState, studioDisplayMessage } from "./common";

export function PublishChecklist({ courseId }: { courseId?: string }) {
	const query = useQuery({
		queryKey: ["studio", "publish-checklist", courseId],
		queryFn: () => getPublishChecklist({ data: { id: courseId ?? "" } }),
		enabled: Boolean(courseId),
	});
	return (
		<Card>
			<CardHeader>
				<CardTitle>{m.studio_before_publish()}</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3">
				<p>{m.studio_checklist_help()}</p>
				{!courseId ? (
					<p>{m.studio_save_course_first()}</p>
				) : (
					<>
						<QueryState query={query} />
						{query.data && (
							<>
								<p>
									{m.studio_published_count({
										count: query.data.publishedLessons,
									})}
								</p>
								<p>{studioDisplayMessage(query.data.access)}</p>
								{query.data.issues.length ? (
									<ul className="list-disc pl-5">
										{query.data.issues.map((issue) => (
											<li key={issue}>{studioDisplayMessage(issue)}</li>
										))}
									</ul>
								) : (
									<p>{m.studio_checks_passed()}</p>
								)}
								<p>{m.studio_draft_help()}</p>
							</>
						)}
						<Button
							type="button"
							variant="outline"
							onClick={() => void query.refetch()}
						>
							{m.studio_refresh_checklist()}
						</Button>
					</>
				)}
			</CardContent>
		</Card>
	);
}
