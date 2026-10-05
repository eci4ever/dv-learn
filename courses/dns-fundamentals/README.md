# DNS Fundamentals delivery

`COURSE.md` is the reviewable blueprint. `course.json` contains the plain-text learner copy, ordered section and lesson IDs, primary-source links, and version 1 activity data. All six lessons are free public previews; no videos, paid product, or automatic enrollment.

Validate: `node scripts/publish-dns-course.ts --validate-only`.

Create local drafts: `node scripts/publish-dns-course.ts --local --create`.

Publish local after review: `node scripts/publish-dns-course.ts --local --publish`.

Remote actions use `--remote` instead, only with explicit owner authorization. Apply migration 0009 and deploy the configured-activity renderer first. Creation refuses to overwrite existing IDs. Publication validates the actual stored lessons and preview policy before changing visibility.

Practice answers and scores are temporary client state. Manual completion is saved separately and requires a verified account with course access. Client-visible answer keys are not proof of passing an assessment. No live DNS requests are made.

Activity validation and renderer are shared with Studio. Existing IP activities remain supported. To revise an imported course, use Studio; rerunning create is deliberately not an overwrite operation.

The 5–6 October polish revision changes repository learner copy and shared presentation only. Production remains on the previously approved course. Local Studio QA previews all six revised bodies using disposable unpublished fixtures; the normal local course records are not overwritten. Review the polish record in `COURSE.md` before authorizing record synchronization and deployment. Saving a published lesson in Studio updates its live copy immediately; there is no separate persisted revision layer.
