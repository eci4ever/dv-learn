# Course blueprint template

Copy this into `courses/<slug>/COURSE.md`. Replace bracketed fields and repeat the lesson section as needed. Apply [COURSE_STANDARD.md](COURSE_STANDARD.md); do not treat this document as an import payload.

## Brief

- Standard version: 1
- Editorial status: draft
- Title: [title]
- Slug: [stable-kebab-case-slug]
- Category / level: [category] / [level]
- Audience: [who this is for]
- Prerequisites: [specific prior knowledge, or none]
- Description: [learner-facing plain English]
- Estimated active time: [sum of lesson estimates, including practice]
- Delivery target: [repository draft / explicitly authorized local implementation]
- Access intention: [free previews / manual enrollment / paid; pricing only when requested]
- Existing record mapping: [IDs if revising an existing course; otherwise none]

## Outcomes and coverage

| Outcome ID | Learner can… | Lesson / practice evidence |
|---|---|---|
| O1 | [observable action] | [lesson and task ID] |

## Outline

| Order | Section | Lesson ID / title | Objective | Minutes | Runtime type / activity | Preview intention |
|---|---|---|---|---|---|---|
| 1 | [section] | L1 / [title] | [one primary objective] | [estimate] | [supported mapping or gap] | [yes/no] |

## Lesson L1: [title]

- Objective / outcomes: [objective and outcome IDs]
- Runtime mapping: [lessonType / activity; video URL only for video]
- Completion: [actual current behavior; distinguish any proposed rule]
- Persistence: [what survives reload and what resets]
- Sequence exceptions: [none, or reason]

### Learner copy

#### Explain

[Short explanation; define new terms.]

#### Worked example

[Starting data, steps, answer and reasoning.]

#### Practice P1

[Action, inputs, constraints and expected observation. Keep answer keys below unless an intentional self-check is part of the lesson.]

#### Hint and feedback

[Where learners see the hint and feedback; distinguish implemented UI from authored guidance.]

#### Recap

[What the learner can now do and how the next lesson builds on it.]

### Author-only answer key and QA

- P1 accepted answer / validation: [include normalization, units or tolerance]
- Correct reasoning: [why]
- Likely mistake / feedback: [wrong answer and helpful explanation]
- Retry/reset: [behavior]
- Correct / incorrect / boundary cases: [inputs → expected outputs]
- Sources: [primary-source links supporting this lesson]

## Capability gaps and assumptions

[List unsupported requirements, requested decisions and smallest proposed implementation. Use none when all requirements fit current capabilities.]

## Review evidence

| Gate from the standard | Result | Evidence / reason |
|---|---|---|
| Content | [result] | [answer checks, source review, outcome coverage] |
| Capability | [result] | [code paths inspected, gaps] |
| Activity | [result] | [cases exercised] |
| Experience | [result] | [widths, theme, keyboard; unverified cases] |
| Access/progress | [result] | [scope and evidence] |
| Engineering | [result] | [commands and results, or no runtime change] |

## Handoff

- Files authored / records created: [separate lists]
- Published: [no unless explicitly authorized and performed]
- Blocking issues / next owner action: [specific action]
