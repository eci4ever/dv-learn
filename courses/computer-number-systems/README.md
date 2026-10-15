# Computer Number Systems release

Published course: [Computer Number Systems: Decimal, Binary and Hex](https://learn.nimfi.dev/courses/computer-number-systems).

Owner authorized free publication. All six lessons are public previews; `free_enrollment=1` enables verified users to enroll without checkout and save completion. No paid product, price, production account or progress record was created by the publication workflow. English content only; BM/EN currently changes the interface, not this course's content. Existing courses and environment variables were retained.

## Source and record mapping

`COURSE.md` is the reviewable blueprint. `bundle.ts` extracts only learner copy, converts the Practice headings to the player convention and adds authored activity configs validated against current schemas. It is Node-side authoring tooling, not client runtime code or a generic importer.

Course ID/slug: `computer-number-systems`. Sections: `computer-number-systems-s1` through `computer-number-systems-s4`.

| Lesson ID | Runtime kind | Minutes |
| --- | --- | --- |
| numbers-bases | practice-quiz | 7 |
| numbers-read-binary | error-spot | 10 |
| numbers-build-binary | text-select | 10 |
| numbers-hex | error-spot | 10 |
| numbers-binary-hex | error-spot | 11 |
| numbers-detective | practice-quiz | 12 |

## Explicit publication commands

Run from the workspace root using installed dependencies:

```bash
node scripts/publish-number-course.ts --validate-only
node scripts/publish-number-course.ts --local --create
node scripts/publish-number-course.ts --local --publish
node scripts/publish-number-course.ts --local --inspect
```

Remote equivalents require explicit authorization for the target. This release used `--remote --create`, inspected stored draft content, then separately ran `--remote --publish`. Creation refuses existing IDs/slugs and never overwrites or publishes. Publication checks exact stored lesson content/configs, section mapping, preview/free flags and the absence of a linked product. Later edits through Studio deliberately cause this original-release publisher to refuse mismatched records; it is not a sync or overwrite tool. Do not delete existing records to rerun creation.

There is no migration or provider call for these offline activities. Completion remains manual and separate from practice scores; attempts reset on reload or content language change. No secure assessment or credential is claimed.

## Verification

- `--validate-only`: six supported lessons, 60 minutes, free enrollment.
- `npm run check`, `npm run typecheck`, `npm test`, `npm run build`: passed; 137 unit/integration tests across 22 files.
- `PLAYWRIGHT_NUMBERS_COURSE=1 PLAYWRIGHT_ALLOW_LOCAL_FIXTURES=1 npm run test:e2e -- tests/e2e/number-course.spec.ts`: two tests passed, covering every task/question, retry/reset/reload, keyboard, all six lessons in light/dark at 320/375/768/1280px, public completion restrictions and authenticated free enrollment/completion reload.
- Existing `lesson-layout`, `interface-fixes` and `dns-course` browser regressions: six tests passed.
- Local test users cleaned up; read-only query found zero `numbers-*` user fixtures. Authenticated fixtures require an explicit opt-in and localhost/127.0.0.1; external requests are blocked. No course deletion used for cleanup.
- Production records inspected against the reviewed bundle and explicitly published. `PLAYWRIGHT_BASE_URL=https://learn.nimfi.dev PLAYWRIGHT_NUMBERS_COURSE=1 npm run test:e2e -- tests/e2e/number-course.spec.ts --grep 'public previews'`: passed, exercising all six live lessons and every answer, retry/reset/reload, keyboard and all listed width/theme combinations. Public browser verification is read-only; no production login/enrollment/progress writes. Screenshot: `/tmp/dv-learn-number-course-production.png`.
- Actual screen-reader, 200% browser zoom, RTL and real iOS/Safari: Not verified. These limits are not implied by the Chromium reflow tests.

## Required mobile fix

The longer course title and primary-source URLs exposed existing horizontal overflow. The `better-layout` review guided wrapping in the existing design system without changing navigation or hiding content.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | src/components/platform.tsx, lesson back-link | Button used nowrap and exceeded 320px with the full course title. | Auto-height, max-width and normal wrapping; full title and real navigation preserved. | Plan for growth and clipping: learners can return to the course without horizontal scrolling. |
| HIGH | src/components/lesson-body.tsx, resource list | Long URLs expanded grid items beyond the viewport. | Min-width-zero items and overflow-wrap:anywhere links. | Hold structure until it breaks: all reference text remains accessible within mobile margins. |

Scoped result: Approve after the supported width/theme checks passed. Unverified zoom/RTL/device coverage remains listed above. Worker deployed with `--keep-vars`; version `c25597bf-faf7-4c61-83e1-8a2b2bd8aad1`. No Git commit or push performed in this publication request.
