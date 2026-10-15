import * as m from "../paraglide/messages.js";
import { AppLink } from "./app-link";
import { Button } from "./ui/button";
import { Empty } from "./ui/empty";

export function NotFoundPage() {
	return (
		<Empty className="empty">
			<h1>{m.learner_page_not_found()}</h1>
			<Button
				role="link"
				nativeButton={false}
				className="button"
				render={<AppLink href="/" />}
			>
				{m.learner_back_to_courses_2()}
			</Button>
		</Empty>
	);
}
