import { useQuery } from "@tanstack/react-query";
import { getPublishChecklist } from "../../server/studio";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { QueryState } from "./common";

export function PublishChecklist({ courseId }: { courseId?: string }) {
	const query = useQuery({
		queryKey: ["studio", "publish-checklist", courseId],
		queryFn: () => getPublishChecklist({ data: { id: courseId ?? "" } }),
		enabled: Boolean(courseId),
	});
	return (
		<Card>
			<CardHeader>
				<CardTitle>Before publishing</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3">
				<p>
					Checklist for your saved course. Save draft changes to refresh it.
					Publishing is checked again on the server.
				</p>
				{!courseId ? (
					<p>Save this course as a draft, then add sections and lessons.</p>
				) : (
					<>
						<QueryState query={query} />
						{query.data && (
							<>
								<p>{query.data.publishedLessons} published lessons</p>
								<p>{query.data.access}</p>
								{query.data.issues.length ? (
									<ul className="list-disc pl-5">
										{query.data.issues.map((issue) => (
											<li key={issue}>{issue}</li>
										))}
									</ul>
								) : (
									<p>Required checks passed. You can publish this course.</p>
								)}
								<p>
									Draft lessons remain hidden from students. Free preview opens
									an individual published lesson, not the rest of the course.
								</p>
							</>
						)}
						<Button
							type="button"
							variant="outline"
							onClick={() => void query.refetch()}
						>
							Refresh checklist
						</Button>
					</>
				)}
			</CardContent>
		</Card>
	);
}
