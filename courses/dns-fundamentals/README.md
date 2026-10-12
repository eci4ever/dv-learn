# DNS Fundamentals delivery

`COURSE.md` is the reviewable blueprint. `course.json` contains the plain-text learner copy, ordered section and lesson IDs, primary-source links, and version 1 activity data. All six lessons are public and free, without videos or a paid product. Enrollment is optional and explicit, not automatic. The 8 October local revision adds free enrollment for verified accounts; production remains unchanged until an authorized release.

Validate: `node scripts/publish-dns-course.ts --validate-only`.

Create local drafts: `node scripts/publish-dns-course.ts --local --create`.

Publish local after review: `node scripts/publish-dns-course.ts --local --publish`.

Remote actions use `--remote` instead, only with explicit owner authorization. Apply migrations through 0011 and deploy the current shared renderer first. Creation refuses to overwrite existing IDs. Publication validates the actual stored lessons and preview policy before changing visibility. For an existing DNS course, migrations 0010–0011 opt in free enrollment and replace only the previous exact progress/practice instructions; do not rerun the create importer to update records.

Practice answers and scores are temporary client state. Manual completion is saved separately and requires a verified account with course access. Client-visible answer keys are not proof of passing an assessment. No live DNS requests are made.

Free enrollment uses its own idempotent record, not a manual grant, purchase or payment. Eligibility is checked at enrollment and every subsequent access: the course must opt in, be published and unarchived, contain at least one published lesson, expose every published lesson publicly, and have no active attached product. Changing this policy stops free-enrollment access, while independent manual/purchase grants and stored progress remain intact. Revoked free enrollments are not automatically revived.

The course and player label the actual content language. The 12 October bilingual revision adds `course.ms.json`, retaining English technical terms, original IDs, sources, answer keys and simulation values. For DNS, BM/EN changes course/lesson copy, practice instructions and glossary explanations as well as the interface, without changing URLs or saved progress. Shared records/quiz practice shows one task at a time and allows retry/back/reset, without requiring a passing score to mark a lesson complete. Wrong quiz answers link only to lessons in the visible course outline. Glossary definitions live in `src/lib/course-glossaries.ts`; other courses need their own reviewed translations.

### Bilingual import and review

Validate BM: `node scripts/import-dns-translation.ts --validate-only`.

Apply migration 0012 locally, then `node scripts/import-dns-translation.ts --local`. This creates separate translation rows for the existing course, three sections and six lessons. It does not replace English records, publish a course, change pricing or grant access. IDs and progress are shared. The importer checks identity, sources, estimated time and grading parity, and snapshots the actual stored English copy. Review any differences between stored English and the manifest before refreshing translations.

Studio continues to edit the base-language records. Source edits invalidate the corresponding translation, which falls back to the base language and shows its actual language label. Revise/review the BM manifest, then refresh explicitly with `--local --replace`; existing translations are not overwritten without this flag. Translation payloads are validated and applied server-side after the original access/publication checks. They cannot override access flags, IDs or grading rules. Course metadata and outline contain no translated lesson bodies.

Canonical section markers such as `Explain`, `Recap` and `Self-check — read after practising` remain English parser tokens in both manifests. The shared renderer displays their BM labels. Do not translate these tokens in the stored plain text, or expose self-check answers as ordinary reading sections.

Production release additionally requires explicit owner authorization, migration 0012, an authorized translation import using `--remote`, and deployment of the bilingual renderer. Nothing in this local revision changes production automatically. Practice answers reset on language switching/reload; saved lesson completion does not.

Activity validation and renderer are shared with Studio. Existing IP activities remain supported. To revise an imported course, use Studio; rerunning create is deliberately not an overwrite operation.

The 5–6 October polish revision changes repository learner copy and shared presentation only. Production remains on the previously approved course. Local Studio QA previews all six revised bodies using disposable unpublished fixtures; the normal local course records are not overwritten. Review the polish record in `COURSE.md` before authorizing record synchronization and deployment. Saving a published lesson in Studio updates its live copy immediately; there is no separate persisted revision layer.
