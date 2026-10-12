import { courseGlossaries, courseGlossariesMs } from "../lib/course-glossaries";
import type { ContentLanguage } from "../lib/learning-text";
import * as m from "../paraglide/messages.js";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";

export function CourseGlossary({
	slug,
	language = "en",
}: {
	slug: string;
	language?: ContentLanguage;
}) {
	const glossary = language === "ms" ? courseGlossariesMs : courseGlossaries;
	const terms = Object.hasOwn(glossary, slug) ? glossary[slug] : undefined;
	if (!terms) return null;
	return (
		<section
			className="my-5 grid gap-3 rounded-xl border p-4"
			aria-label={m.glossary()}
		>
			<p className="text-base font-medium">{m.glossary_hint()}</p>
			<div className="flex flex-wrap gap-2">
				{terms.map(({ term, definition, example }) => (
					<Dialog key={term}>
						<DialogTrigger
							render={<Button variant="outline" className="min-h-11" />}
							aria-label={m.explain_term({ term })}
						>
							{term}
						</DialogTrigger>
						<DialogContent lang={language}>
							<DialogHeader>
								<DialogTitle>{term}</DialogTitle>
								<DialogDescription className="text-base leading-relaxed">
									{definition}
								</DialogDescription>
							</DialogHeader>
							<p className="text-base leading-relaxed">
								{language === "ms" ? "Contoh" : "Example"}: {example}
							</p>
						</DialogContent>
					</Dialog>
				))}
			</div>
		</section>
	);
}
