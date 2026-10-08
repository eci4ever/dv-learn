# Course authoring standard

Version: 1. Applies to course content and activities built for DV Learn.

## Deliverable and authority

Keep the reviewable course blueprint at `courses/<slug>/COURSE.md`, using [COURSE_TEMPLATE.md](COURSE_TEMPLATE.md). Record the standard version used. Existing courses may retain their identifiers and locations; record the mapping instead of silently replacing them.

Course creation defaults to a repository draft. Creating records in local Studio requires that implementation to be in scope. Production writes, publishing, pricing changes, enrollment grants, deployment and provider calls require explicit authorization for those actions and targets. A request to write content is not authorization to publish it.

Use `draft`, `review-ready`, or `approved` for editorial status. These are blueprint labels, not application database fields. An agent may mark work review-ready with evidence; owner approval is required for approved status. Keep new application course and lesson records unpublished until publishing is authorized.

## Course contract

Every course specifies:

- Title, stable slug, category, level, intended audience and prerequisites.
- A plain-English description and observable learning outcomes: what the learner can do, not merely understand.
- An ordered outline with lesson objectives, estimated active learning time, runtime lesson type/activity, and intended preview access.
- Outcome coverage: which practice or assessment demonstrates each outcome.
- Sources for factual claims, asset provenance, and any unresolved assumptions.
- Delivery target, required platform changes, actual completion behavior and review evidence.

Choose lesson count and length to fit the requested scope. Prefer short lessons with one primary objective; estimates include practice time and are not validated measurements. Videos are optional.

## Lesson design

Use **Explain → Worked example → Practice → Feedback → Recap** as the default sequence. An assessment-only lesson may reference earlier explanations/examples rather than repeat them. Record any other deliberate exception.

Write learner-facing text in plain English. Define unfamiliar terms on first use. Instructions name the action and expected result. Keep author-only answers, QA cases and implementation notes separate from learner copy. Label answer-revealing worked examples and self-check answers deliberately.

For each practice task, provide:

- A prompt tied to the lesson objective, including constraints and starting data.
- Accepted answers or a deterministic validation rule; state units, rounding, case/whitespace handling where relevant.
- A hint that helps without immediately giving away the answer.
- Correct-answer reasoning and feedback for likely mistakes. Explain how to improve, not just whether an answer is wrong.
- Retry/reset behavior, intended completion rule and whether attempts/results persist.
- At least one correct case, one incorrect case and relevant boundary/empty-input cases for QA.

Explorers may show live results rather than grade answers. Pair them with prediction or comparison tasks and expected observations; clicking through alone does not demonstrate the outcome. If a required hint, scoring or feedback interaction is unsupported, record the gap rather than claim it exists.

## Platform compatibility

Inspect current contracts, validation and components before implementation; this table is a baseline, not a substitute for the code.

| Runtime lesson type | Activity | Current behavior |
|---|---|---|
| `reading` | `null` | Plain-text lesson content; manual completion |
| `interactive` | `ipv4`, `private`, `subnet` | Existing IP explorers/checker; live feedback; manual completion |
| `quiz` | `quiz` | Fixed Networking question bank in code; manual completion |
| `interactive` | `activity=null`; `activityConfig.kind=dns-resolution`, `dns-records`, or `dns-cache` | Version 1 configured offline practice, feedback and reset; manual completion |
| `quiz` | `activity=null`; `activityConfig.kind=practice-quiz` | Configurable questions with stable choice IDs, explanations and practice score; manual completion |
| `video` | `null` | Valid YouTube URL required; position saving and ended-video completion for learners with access; manual completion also available |

Interactive input, quiz answers and scores currently live in component state, not durable attempt records. Refresh resets them. Marking a lesson complete does not prove a passing score. A blueprint can propose score-gated completion, but must label it unsupported until implemented and tested.

Blueprint Markdown is an authoring/review format. The lesson player renders `content` as text with limited section and code conventions, not general Markdown or executable HTML. Adapt learner copy for that renderer when entering Studio. A blueprint is not an automatic import file.

Plain-text sections can use a standalone heading separated by blank lines: `Before you start`, `Explain`, `Worked example`, `Practice`, `Common mistakes`, `Recap`, or `Next step`. These become semantic headings and paragraphs in the shared renderer. `Recap` and `Next step` appear after practice. The exact heading `Self-check — read after practising` places its following paragraphs in a closed, keyboard-operable self-check accordion; use it only for intentionally revealable answers. Other text remains literal, including HTML-looking strings, and no general Markdown support is implied. Keep each paragraph short and define terms before the learner needs them.

Use a single backtick pair for inline code, such as `dig example.com`. For a syntax-highlighted block, put three backticks followed by a language on their own line, the code on subsequent lines, and three closing backticks on their own line. Supported languages include `bash` (`sh`, `shell`, `command`, `console`, `terminal`, `zsh`), `javascript` (`js`), `typescript` (`ts`), `json`, `python`, `powershell`, `sql`, `yaml`, `css`, and `xml` (`html`). Blank lines and indentation inside closed fences are preserved. Use `text` for output or plain text; unknown languages and blocks over 20,000 characters fall back to unhighlighted code. Unclosed fences remain literal text. Code is never executed, and examples do not authorize learners to run commands against real systems. The same renderer is used in Studio preview and the lesson player.

For implementation, inspect:

- `src/server/contracts.ts` and `src/server/validation.ts` for actual fields and limits.
- `src/lib/lesson-readiness.ts` and `src/server/publishing.ts` for publish checks and access semantics.
- `src/components/ip-address-lab.tsx` and `src/components/platform.tsx` for activity, progress and rendering behavior.
- `src/lib/lesson-activity.ts`, `src/lib/activity-examples.ts`, `src/components/lesson-activity.tsx` and `src/components/lesson-body.tsx` for configured activity schemas, starters and shared learner/Studio rendering. `activityConfig` is serialized versioned JSON, not executable content. Do not put new kinds in the legacy `activity` field.

The reviewed DNS bundle at `courses/dns-fundamentals/course.json` has a scoped importer: `node scripts/publish-dns-course.ts --validate-only`, then `--local --create` creates drafts. `--local --publish` is a separate visibility change. Remote variants require explicit production authorization. This importer is not a general blueprint-to-course converter and refuses to overwrite existing IDs.

Free public lessons use the preview flag; progress saving still needs an account with course access. Publishing a course does not itself sell it: paid access requires an active linked product, otherwise access may be manual. Record the intended access policy without changing billing implicitly.

## Reusable activities

Keep course content distinct from shared activity implementation. Reuse an existing activity only when it actually teaches the requested objective. Other subjects must not be relabeled as an IP activity just to satisfy the schema.

For a missing interaction, describe the smallest reusable component, data contract, feedback rules and completion/persistence needs. Get direction when this expands the requested work. When activity implementation is authorized, extend the existing application seams and tests; avoid course-specific branches in the lesson player. Inspect existing shadcn components first and use the site's type, color and spacing tokens.

An assessed result used to unlock access, claim a verified pass or issue a credential needs server-side validation. A client-visible answer key is acceptable for practice, not proof of a secure assessment.

## Accuracy and verification

Use primary sources for technical facts and record links near the claims they support. Identify simplifications and exceptions. Explain content in original words; record licenses/permission for reused assets. Keep exercises scoped to simulations or clearly authorized environments.

Review readiness requires evidence for each applicable gate:

| Gate | Evidence |
|---|---|
| Content | Objectives map to tasks; worked answers checked; prerequisites and sources reviewed |
| Capability | Each lesson maps to a supported runtime type, or its gap is explicitly reported |
| Activity | Correct, incorrect and boundary cases; feedback and retry behavior exercised |
| Experience | Keyboard operation, readable feedback, light/dark mode and reflow at 320px, 375px, 768px and desktop; completion follows content |
| Access/progress | Preview cannot write progress; authorized progress survives reload; locked/draft content stays protected when the implementation touches these paths |
| Engineering | Relevant repository checks/tests for changed code, using scripts in `package.json`; test data confined to approved targets and cleaned up |

Report each gate as **Pass**, **Fail**, **Not verified**, or **Not applicable** with a reason and evidence. Code inspection is not a browser test. Content-only drafts may be review-ready for editorial review with runtime gates Not verified; they are not release-ready. Unresolved factual errors, unsupported required behavior or failed applicable gates block release. The Studio publish checklist is necessary but does not replace this review.

## Handoff

State the blueprint path, editorial status, runtime compatibility, actual completion/persistence behavior, changes made, evidence and outstanding gaps. Distinguish files authored from records created and courses published. Leave the owner a concrete next action, such as editorial review or approval for a scoped activity implementation.
