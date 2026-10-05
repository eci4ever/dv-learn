# IPv4 Fundamentals — reference blueprint

## Brief

- Standard version: 1
- Editorial status: draft
- Title: IPv4 Fundamentals
- Slug: ipv4-fundamentals-example
- Category / level: Networking / Beginner
- Audience: Learners starting to read IPv4 addresses and subnet notation.
- Prerequisites: Whole-number arithmetic; no networking experience required.
- Description: Learn to read IPv4 addresses, recognise private ranges and explore subnet boundaries through hands-on practice. No video is required.
- Estimated active time: 30 minutes, including practice; an author estimate.
- Delivery target: Repository reference only; no application records created.
- Access intention: Free public preview for all lessons if publishing is later authorized. Saved lesson progress still requires verified course access.
- Existing record mapping: None. This example does not replace the existing Networking course.

## Outcomes and coverage

| Outcome ID | Learner can… | Practice evidence |
|---|---|---|
| O1 | Recognise an IPv4 address accepted by the strict explorer | L1/P1 and the existing quiz's valid-address question |
| O2 | Distinguish RFC 1918 private addresses from addresses outside those ranges | L2/P2 and the existing quiz's private-range question |
| O3 | Find the network boundary and usable host count of a conventional /26 subnet | L3/P3 and the existing quiz's subnet question |

## Outline

| Order | Section | Lesson ID / title | Objective | Minutes | Runtime type / activity | Preview intention |
|---|---|---|---|---|---|---|
| 1 | Address basics | L1 / Read an IPv4 address | O1 | 7 | interactive / ipv4 | Yes |
| 2 | Address basics | L2 / Recognise private addresses | O2 | 6 | interactive / private | Yes |
| 3 | Subnets | L3 / Explore a subnet boundary | O3 | 10 | interactive / subnet | Yes |
| 4 | Subnets | L4 / Check your understanding | Consolidate O1–O3 | 7 | quiz / quiz | Yes |

For all four lessons, actual completion is manual Mark as complete for a learner with access. Lesson completion survives reload; explorer input, quiz answers and scores do not. Videos are absent (`videoUrl: null`). New records would remain unpublished until owner authorization.

## L1: Read an IPv4 address

### Learner copy

Explain: An IPv4 address has 32 bits. The explorer displays it as four numbers separated by dots. Each number represents eight bits and ranges from 0 to 255. We call each eight-bit part an octet.

Worked example: Enter 192.168.1.10. Its four octets are 192, 168, 1 and 10. The last octet appears as 00001010 in binary: eight plus two makes ten.

Practice P1: Predict whether 192.168.1.256 will be accepted, then enter it. Change the last number to 255 and explain what changed. Try 192.168.1 and identify the missing part.

Hint: Count the parts first. Then compare each number with the maximum value of one octet.

Feedback: If the explorer reports an invalid address, check both the number of parts and their ranges. It also rejects leading zeros to keep the input unambiguous. A value of 256 needs more than eight bits; 255 fits.

Recap: You can check the shape and range of an address. A correctly shaped address is not necessarily suitable for every network. Next, you will learn which addresses belong to private ranges.

### Author-only answer key and QA

- Mapping: `lessonType: interactive`, `activity: ipv4`.
- P1 validation: Four decimal octets, each 0–255, no leading zeros; outer whitespace accepted by the current parser.
- Correct: `192.168.1.255` displays octets; last binary value `11111111`.
- Incorrect: `192.168.1.256` and `192.168.1` show invalid input.
- Boundary: `0.0.0.0` and `255.255.255.255` parse; parsing does not establish host usability. `192.168.01.10` is rejected by this lab's strict input convention.
- Likely mistake: Treating 256 as valid because it is close to 255. Use the eight-bit explanation above.
- Retry: Edit the input; feedback updates live. The written hint is always visible, not a new hint-button feature.
- Source: [RFC 4632, section 3.1](https://www.rfc-editor.org/rfc/rfc4632.html#section-3.1) for 32-bit IPv4 representation. Leading-zero rejection is a lab rule verified in `src/lib/ip-address.ts`, not a claim that this RFC mandates it.

## L2: Recognise private addresses

### Learner copy

Explain: RFC 1918 defines three private IPv4 ranges: 10.0.0.0–10.255.255.255, 172.16.0.0–172.31.255.255 and 192.168.0.0–192.168.255.255. Addresses in these ranges are not globally routed on the public internet.

Worked example: 172.16.0.1 belongs to the middle private range because its second octet is between 16 and 31. 172.32.0.1 falls just outside that range.

Practice P2: Predict the checker's result for 172.15.255.255, 172.16.0.0, 172.31.255.255 and 172.32.0.0. Enter each address and compare its result with your prediction.

Hint: The private range does not include every address that starts with 172.

Feedback: If you classified 172.32.0.0 as private, check the upper boundary: 31 is included, 32 is not. The checker distinguishes RFC 1918 private space from everything outside it. Its “not private” result does not prove that an address is publicly routable; other special-purpose ranges exist.

Recap: You can recognise private space and explain its boundaries. Next, you will divide a range into subnet blocks.

### Author-only answer key and QA

- Mapping: `lessonType: interactive`, `activity: private`.
- P2 accepted results, in prompt order: not RFC 1918 private, private, private, not RFC 1918 private.
- Correct/boundary cases: `10.0.0.0`, `172.16.0.0`, `172.31.255.255`, `192.168.255.255` return private.
- Incorrect case: `172.32.0.0` must not return private. Empty input must show validation feedback, not a classification.
- Retry: Edit the address and compare live feedback; no graded submission or attempt storage.
- Source: [RFC 1918, section 3](https://www.rfc-editor.org/rfc/rfc1918.html#section-3) for ranges; [section 5](https://www.rfc-editor.org/rfc/rfc1918.html#section-5) for routing considerations.

## L3: Explore a subnet boundary

### Learner copy

Explain: A CIDR prefix such as /26 counts network bits. IPv4 has 32 bits, so /26 leaves six host bits. Six bits describe 64 addresses. In a conventional subnet, the network and broadcast addresses leave 62 usable host addresses. This subtraction rule is not universal: /31 and /32 need separate treatment and are outside this lesson's practice scope.

Worked example: For 192.168.1.130/26, blocks in the last octet begin at 0, 64, 128 and 192. The address 130 lies in the 128–191 block. Its network address is 192.168.1.128; its last address is 192.168.1.191.

Practice P3: Enter 192.168.1.130 and select /26. Predict the first and last usable host addresses before reading the results. Keep /26 selected and change the address to 192.168.1.192. Explain why the network changed.

Hint: Find the block containing the address. For a conventional /26, usable hosts exclude the first and last addresses in that block.

Feedback: The original block's usable range is 192.168.1.129–192.168.1.190. If you chose .130 as the network address, separate the address you entered from the boundary of the block containing it. At .192 you have entered the next block.

Recap: You can calculate a /26 boundary and check it with the explorer. Next, use the self-check to review the whole course.

### Author-only answer key and QA

- Mapping: `lessonType: interactive`, `activity: subnet`.
- P3 validation: Exact dotted-decimal addresses; prefix is an integer. Select /26 explicitly because the explorer starts at /24.
- Correct: `.130/26` has network `.128`, mask `255.255.255.192`, 64 total addresses and 62 conventional usable hosts, `.129`–`.190`.
- Boundary: `.191/26` remains in the `.128` block; `.192/26` starts the `.192` block, ending at `.255`, with usable hosts `.193`–`.254`.
- Incorrect: `.256` must show invalid input. The calculation must not use `.130` as the network boundary.
- Retry: Change the address or prefix; live results are shown rather than grading a submitted answer.
- Source: [RFC 4632, section 3.1](https://www.rfc-editor.org/rfc/rfc4632.html#section-3.1) for prefix notation. Worked numbers are arithmetic checks against `src/lib/ip-address.ts`.

## L4: Check your understanding

### Learner copy

Choose an answer for each of the five questions, then select Check answers. Read the explanation for each answer, including those you answered correctly. If you make a mistake, review the matching explorer lesson and retry with Reset quiz.

Hint: Check octet ranges, the 172.16–172.31 private boundary and the size of a /26 block. The prefix is a network-bit count, not a host count.

Recap: Explain one address-validation rule, one private-range boundary and one subnet calculation in your own words. A quiz score is practice feedback, not a verified credential.

### Author-only answer key and QA

- Mapping: `lessonType: quiz`, `activity: quiz`.
- Sequence exception: Assessment-only lesson; explanations and worked examples are in L1–L3.
- Reuse the existing five-question bank in `src/components/ip-address-lab.tsx`. Course authors cannot configure it in Studio.
- Accepted answers in current question order: `192.168.1.10`; `172.16.0.1`; `24`; `192.168.1.128`; `254`.
- QA: Check answers is disabled until all questions are answered. All accepted choices produce 5/5; replacing the first answer with the 256-octet option produces 4/5 and an explanation. Reset removes choices and displayed results.
- Feedback: Existing per-question explanations remain authoritative; the lesson adds a visible review hint, not a dynamic hint feature.
- Completion: Manual, regardless of score; no pass threshold or saved quiz attempts. A requirement for verified passing would be a separate platform change.
- Sources: L1–L3 sources support the quiz topics; the code defines the exact bank and retry behavior.

## Capability gaps and assumptions

All planned runtime mappings exist. The activities are explorers and a fixed self-check, not configurable exercises. Reading practice prompts requires keeping learner notes near the activity; no activity parameters, question editing or automatic import are assumed. The written hints and feedback are lesson copy.

The 30-minute estimate and beginner suitability need learner review. The owner's publishing and access decisions remain pending.

## Review evidence

| Gate | Result | Evidence / reason |
|---|---|---|
| Content | Pass for draft checks | Outcomes mapped above; RFC sources reviewed; worked numbers checked against the current calculation functions. Owner editorial review remains pending. |
| Capability | Pass by code inspection | Contracts, publish validation, player and IP lab inspected; unsupported features are explicitly excluded. |
| Activity | Not verified | This documentation task does not instantiate or browser-test this course. Calculation checks alone do not verify interactions. |
| Experience | Not verified | This blueprint has no rendered course to test for keyboard, theme or reflow. |
| Access/progress | Not verified | No course, access grants or progress records were created. |
| Engineering | Not applicable | No runtime code or schema changed. |

## Handoff

- Files authored: This blueprint only.
- Records created / published: None / no.
- Next owner action: Review learner copy and intended access. Then authorize creating unpublished local Studio records if desired.
- Release status: Not release-ready; runtime review gates remain unverified.
