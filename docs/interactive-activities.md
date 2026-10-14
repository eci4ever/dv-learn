# Reusable interactive activities

Status: review-ready implementation. Implementation target: shared learner player and Studio preview/editor. No production course is automatically changed. These activities use version 1 `activityConfig`, `lessonType=interactive` and `activity=null`. They need no video, live DNS, provider request or new database migration. Serialized configurations are capped at 64,000 characters.

## Authoring through Studio

Choose an interactive lesson and select **Select text parts**, **Find and fix an error**, or **Branching scenario**. Each selection creates an editable starter. The Activity builder edits content and answers without requiring code or JSON. Preview the draft, then save. The ordinary publication checklist still applies. Raw JSON remains available for advanced edits.

An empty field or incomplete graph is allowed while editing, but cannot be saved as valid configured practice. Keep IDs stable when revising an activity. Removing a scenario stage does not silently retarget its choices: fix the incoming choices before saving. New stages must be connected to a path from the start.

## Text selection (`text-select`)

Use for identifying parts of a URL, a sentence, or a supplied output. Each task has a prompt, ordered `segments` with stable IDs and display text, an exact set of `answerIds`, a hint and an explanation. Learners toggle parts using real buttons; selected parts have a checkmark and pressed state. Multiple correct parts are supported. Missing, duplicate or extra answers are not correct.

Bounds: 1–12 tasks, 2–20 segments per task. Answer IDs must identify existing segments. Selection depends on IDs, not character offsets, so translating display text does not move an answer boundary. The author determines the chunks; this is not unrestricted browser text selection.

## Error correction (`error-spot`)

Use for diagnosing and correcting one wrong field in a supplied example. Each task has labeled `fields` (IDs, labels and original values), one `errorFieldId`, `acceptedValues`, a `caseSensitive` boolean, a hint and an explanation. A correct field selection and accepted corrected value are both required. Outer whitespace is trimmed; when case sensitivity is off, both values use lowercase comparison. No regex, partial match or arbitrary code is evaluated.

Bounds: 1–12 tasks, 2–10 fields per task, 1–10 accepted corrections of at most 500 characters each. Add accepted variants explicitly, including any optional punctuation. Technical sample values and accepted corrections are shared between languages, not translated answer keys.

## Branching evidence scenario (`branching-scenario`)

Use for deciding what to inspect next from supplied evidence. Define `startId` and 3–20 nodes. A decision has title, text, hint and 2–6 choices. Each choice has an ID, text, feedback explanation and `nextId`. An outcome has title, text and `outcome=success|retry`.

The graph must have unique IDs, a decision start, existing choice targets, no cycles, no unreachable nodes and at least one reachable success outcome. Every path therefore ends in an outcome. Learners choose, check feedback, then continue; they can backtrack or reset. Success means reaching an authored practice outcome, not verified mastery or a certificate.

## Feedback, access and persistence

- Check answer remains available for unanswered tasks and supplies a helpful missing-answer message. Hints are deliberately revealable. Ordinary incorrect attempts reveal authored reasoning and permit retry.
- All text is rendered as text, not HTML, scripts or executable commands.
- Keyboard and touch use shadcn/Base UI buttons, radio controls, inputs and accordions; no drag-only interaction is required. New tasks/stages receive focus. Feedback uses an existing empty polite status region.
- Answers and paths live only in React component state. Reload or changing content language resets practice. They make no progress writes themselves.
- Mark complete and Complete & continue remain separate, authorized lesson-completion actions. Completion is not score-gated. Public previews cannot save progress.

## BM/EN and grading protection

Use Studio Translations to edit title, prompt, text, label, hint and explanation. Segment/node/choice IDs, segment order, answer IDs, error field, original error values, accepted values, case sensitivity, starting stage, targets and outcome types are protected. Existing source snapshots and stale-translation fallback still apply. A translation may change wording, never grading or branching behavior.

## Starter accuracy and provenance

Starter learner copy is original, fictional DNS material, not a live lookup or production configuration. It demonstrates hostname selection, a CNAME target name and evidence-led handling of a misspelled queried name. DNS vocabulary and CNAME/NXDOMAIN distinctions follow [RFC 9499](https://www.rfc-editor.org/rfc/rfc9499.html); sample domains follow [IANA example domains](https://www.iana.org/help/example-domains). Starters are templates, not an automatically published DNS course revision. Authors must validate their own task answers and document their sources according to COURSE_STANDARD.md.

## Verification checklist

Validate correct, incorrect and unanswered attempts; hint keyboard controls; reset/backtracking; raw JSON and incomplete visual edits; invalid graph rejection; save/reload and translation round trips; locale/theme changes and narrow layouts; unchanged preview/progress boundaries. Local browser fixtures must be opt-in, local-only and cleaned up. These activities are practice: server-side assessments and durable attempt records remain unsupported.

## Review evidence

| Gate | Result | Evidence and boundary |
| --- | --- | --- |
| Content | Pass, starter scope | Three original, fictional starters demonstrate hostname identification, correcting a CNAME target and choosing an evidence-led diagnosis. Worked answers and DNS terminology checked against the primary sources above. No existing course copy replaced. |
| Capability | Pass | Schema, starters, player, shared preview, visual builder, publication validation and translation grading guards support all three kinds. Old activities remain supported. |
| Activity | Pass | Unit cases cover correct, incorrect, empty/unknown/duplicate answers, case sensitivity, dangling/cyclic/unreachable graphs and protected translations. Local Chromium exercises hints, correction feedback, branch outcomes, backtracking and reset. |
| Experience | Pass, scoped | Local browser checks cover keyboard Enter/Space, focus after stage changes, stable status feedback, BM/EN UI and localized activity text, light/dark, reduced motion and 320/375/768/1280px reflow. Incomplete visual edits and invalid advanced JSON retain input. Real screen-reader testing, formal automated accessibility auditing, browser zoom at 200% and real iOS/Safari remain Not verified. |
| Access/progress | Pass, scoped | Public fixture previews can practise but cannot mark completion. Widgets make no persistence/provider calls. Existing authenticated completion/enrollment, reload, locked/draft and role tests pass; no new score gating is claimed. |
| Engineering | Pass, local | 133 unit/integration tests, lint, typecheck and build pass. A full 50-test Chromium suite passed; affected Studio/activity and reduced-motion cases were rerun after final repairs. Opt-in local fixtures were cleaned up. No production data, billing, publication flags or deployment changed. |

This evidence is for reusable platform components and test fixtures, not a new published course. New authored lessons still require their own course-standard review and explicit publication authorization.
