---
name: course-authoring
description: Create, revise, or review DV Learn course blueprints and interactive lessons against the repository course standard. Use for course authoring, not unrelated platform development.
---

# Course authoring

Work from the repository root. Read [COURSE_STANDARD.md](../../../COURSE_STANDARD.md) completely before authoring or reviewing content. For a new blueprint, use [COURSE_TEMPLATE.md](../../../COURSE_TEMPLATE.md). Read [the IPv4 example](../../../courses/examples/ipv4-fundamentals/COURSE.md) when a concrete interactive-course reference would help; it is not a fixed topic or lesson-count requirement.

## Workflow

1. Establish topic, audience, outcomes, prerequisites, delivery target and requested access policy from the brief. Record non-blocking assumptions. Ask only for decisions that materially change the course or require additional authority.
2. Map the outline to current runtime capabilities using the standard's implementation pointers. Finish this step with every lesson marked supported or with a named gap. Do not promise a configurable quiz, durable attempts or score-gated completion based solely on an authored blueprint.
3. Write or revise the course blueprint, linking outcomes to practice and keeping learner copy separate from author-only validation/QA. Check each worked answer and cite primary sources for technical claims.
4. Implement only the requested scope. If the request includes local Studio records, preserve existing IDs when revising and use unpublished records. For missing activities, propose the shared component and seek direction when its implementation expands scope. Follow the repository Intent-loading instructions before substantial code edits.
5. Apply the standard's review gates. For content-only work, report runtime checks as Not verified rather than inventing test results. For implementation, exercise feedback, retry, progress and access paths affected by the change, plus the existing repository checks appropriate to the edits.
6. Hand off with editorial status, supported mappings, real completion/persistence behavior, evidence and unresolved gaps. Repository files, local records and published production courses are different deliverables; say which actually exist.

## Mutation boundary

Follow the standard's authorization rules immediately before any external mutation. The normal result is a draft for owner review, not a published course. Do not treat this skill, a template, or example content as permission to change production, billing, enrollments or deployment.
