# Computer Number Systems: Decimal, Binary and Hex

## Studio revision — 15 October 2026

Editorial status: review-ready. The owner requested improvements to the existing live course. All six English lesson notes and their BM translations were updated through production Studio. This revision supersedes the original publication snapshot below. Studio holds the current learner copy; the original bundle and local records are not a synchronization source for these edits.

Following the course-authoring standard, each lesson now adds an observable goal, a worked visual or method reference, and a written self-check with reasoning hidden until revealed. Existing activity IDs, configurations, grading keys, access and completion rules remain unchanged. No new component or deployment is required. Keep the English parser headings in both languages; the player translates their display labels.

| Lesson / outcomes | Added explanation or reference | Written self-check and checked answer |
|---|---|---|
| L1 / O1, O5 | Decimal five = binary 101 = hex 0x5; distinguish a base from its largest digit. | Removing zero from decimal 205 gives 25: zero holds the tens position. |
| L2 / O2 | Aligned eight-bit place values for 00010110; three active bits contribute 22, not 3; rightmost bit identifies odd/even values. | 00001010 = 10; 00001011 = 11. Flipping the last bit from 0 to 1 adds one. |
| L3 / O3, O5 | Full subtraction trace for 37, including skipped places and remaining amount; define unsigned. | 64 = 01000000; 65 = 01000001. Zero and 255 boundaries reiterated. |
| L4 / O1, O4 | A–F digit reference and reverse check for 45 = 0x2D. | 0x0F + 1 = 0x10 = decimal 16; 0xFF = 255. |
| L5 / O4 | All sixteen four-bit patterns; grouping a shorter pattern from the right: 11100 → 0001 1100 → 0x1C = 28. | 0x6A = 01101010 = 106, independently checked through both place-value methods. |
| L6 / O2–O5 | Method-selection guide and an optional transfer challenge. | 0x96 = 10010110 = 150. Byte interpretation depends on context; this course uses unsigned numbers. |

The six written self-checks are ungraded, optional practice; their responses are not stored. Their answer accordions follow the interactive activity and precede the recap. All additions are original wording in EN and BM, retaining technical terms in English. References remain S1–S3 below; S1 was reopened for factual review. The original 60-minute estimate remains an unmeasured estimate; optional reflection may take longer.

Revision evidence (not a rerun of the original release suite):

- Content: Pass, scoped. English additions checked against their BM counterparts; arithmetic and the four-bit mapping checked. Six BM translations show Ready after reloading Studio.
- Capability: Pass. Existing plain-text sections, text code blocks and self-check accordion render the additions; no activity schema changes.
- Activity: Pass for the new self-check interaction: all six EN and BM accordions start closed and open with Enter. Existing graded activities were not changed or fully retested in this revision.
- Experience: Pass, scoped to BM reflow at 320, 375, 768 and 1280 pixels for every lesson; no document overflow. English lesson rendering and keyboard self-check operation checked. Dark mode, screen readers and real mobile devices: Not verified in this revision.
- Access/progress: Not applicable to this content-only revision; no access or progress writes performed during verification.
- Engineering: Not applicable to runtime code; no application code, dependencies or deployment changed for this revision.

## Brief

- Standard version: 1
- Editorial status: approved for free publication by the owner; implemented and published after scoped verification.
- Title: Computer Number Systems: Decimal, Binary and Hex
- Slug: computer-number-systems
- Category / level: Computing fundamentals / beginner
- Audience: First-time computing learners preparing for programming, networking or digital electronics.
- Prerequisites: Add and multiply small whole numbers. No programming, networking or exponent notation required.
- Description: Read the same number in three different ways. Start with familiar decimal numbers, build binary numbers from place values, and use hex to make binary easier to read. Practise with short challenges and clear explanations. No videos or software installation needed.
- Estimated active time: 60 minutes, including practice; an editorial estimate, not measured learner time.
- Delivery target: Repository blueprint and validated bundle, with matching local and production Studio records. The blueprint itself is not an import payload.
- Access intention: Owner authorized all six lessons as free public previews. Free enrollment enabled; a verified enrolled account is required to save progress. No paid product added.
- Existing record mapping: Course `computer-number-systems`; section IDs `computer-number-systems-s1` through `computer-number-systems-s4`; lesson IDs listed in `bundle.ts` and README. Existing DNS records unchanged.
- Language: Plain English learner copy under the repository standard. BM adaptation is a separate next step; retain decimal, binary, hexadecimal, base, bit, byte and place value as technical terms.
- Scope: Non-negative whole numbers, mainly unsigned 8-bit values from 0 to 255. No negative-number encoding, fractions, floating point, bitwise operators, endianness or storage-unit conversion.
- Assets: Original text and fictional exercises. No copied diagrams, video, external images or executable commands.

## Outcomes and coverage

| Outcome ID | Learner can… | Lesson / practice evidence |
|---|---|---|
| O1 | Identify valid digits and place values for decimal, binary and hex. | L1/P1; L4/P4; L6/Q1 |
| O2 | Convert a supplied unsigned binary pattern to decimal using place values. | L2/P2; L6/Q2 |
| O3 | Construct an 8-bit binary representation of a supplied decimal number. | L3/P3; L6/Q3–Q4 |
| O4 | Convert a two-digit hex number to decimal and group binary into hex digits. | L4/P4; L5/P5; L6/Q5–Q6 |
| O5 | Recognize equal values written in different bases and spot invalid digits or an 8-bit range error. | L1/P1; L3/P3; L6/Q1, Q4, Q7–Q8 |

## Outline

| Order | Section | Lesson ID / title | Objective | Minutes | Runtime type / activity | Preview intention |
|---|---|---|---|---|---|---|
| 1 | Start with place value | L1 / One value, different bases | Identify a base and valid digits. | 7 | `quiz`, `activity=null`, config `practice-quiz` v1 — supported | Yes |
| 2 | Binary | L2 / Read binary from right to left | Add the active binary place values. | 10 | `interactive`, `activity=null`, config `error-spot` v1 — supported | Yes |
| 3 | Binary | L3 / Build an 8-bit number | Select place values that total a target decimal value. | 10 | `interactive`, `activity=null`, config `text-select` v1 — supported | Yes |
| 4 | Hexadecimal | L4 / Meet hex: sixteen digits | Use hex digit values and the 16s place. | 10 | `interactive`, `activity=null`, config `error-spot` v1 — supported | Yes |
| 5 | Hexadecimal | L5 / Four bits make one hex digit | Convert through groups of four bits. | 11 | `interactive`, `activity=null`, config `error-spot` v1 — supported | Yes |
| 6 | Put it together | L6 / Number detective | Apply conversion and range checks independently. | 12 | `quiz`, `activity=null`, config `practice-quiz` v1 — supported | Yes |

## Shared delivery contract

- All lessons follow Explain → Worked example → Practice → Feedback → Recap. L6 is a practice assessment referencing earlier methods, with a short refresher and a new worked example.
- Completion: Current manual Mark complete / Complete & continue for authorized enrolled learners. Checking every task is recommended learning practice, not an enforced unlock or passing requirement.
- Persistence: Practice answers, selections and scores reset on reload or content-language change. Saved lesson completion is separate and persists for authorized learners. Public preview access alone does not permit progress writes.
- Every value is explicitly labeled by base. Prefixes `0b` and `0x` identify notation in these exercises; they do not contribute to the value and are not a claim about every programming language.
- “8-bit” always means exactly eight binary digits, interpreted as an unsigned whole number here. Leading zeros preserve the value but can satisfy the requested width. Wider numbers are possible outside that constraint.
- Runtime feedback boundary: Error Spot has field/correction feedback plus one authored explanation, not a different authored message for every wrong string. Text Select uses one authored explanation and exact selected IDs. Practice Quiz provides per-question explanations after checking; it has no dedicated hint field. Put quiz hints in the learner Practice text, not unsupported config properties.
- Input boundary: Error Spot accepts enumerated strings, trims outside whitespace and uses `caseSensitive=false`. It is not a general calculator. Binary grouping spaces are for display; corrected binary answers use uninterrupted digits. Exact accepted alternatives are listed below.
- QA empty-input baseline: Unanswered interactive checks must request an answer and never report success. A quiz with no correct selections must not award correct answers. Confirm actual UI behavior during implementation.
- Runtime authoring: Adapt Learner copy to the supported plain-text section conventions when entering Studio. Blueprint headings/tables are authoring aids, not promised general Markdown rendering.

## Lesson L1: One value, different bases

- Objective / outcomes: Identify a base and valid digits; O1, O5.
- Runtime mapping: `quiz` / `activity=null` / `practice-quiz`, version 1.
- Completion / persistence: Shared delivery contract; practice score is not a verified pass.
- Sequence exceptions: None.

### Learner copy

#### Explain

A number is a value. A number system is a way to write it. The base tells you how many digit symbols the system uses. Decimal uses base 10: the digits 0 through 9.

Place value means that a digit's position changes its contribution. In decimal 352, the 3 contributes 300, the 5 contributes 50, and the 2 contributes 2.

Binary uses base 2 and the digits 0 and 1. Hexadecimal, or hex, uses base 16: 0 through 9, then A through F. We will learn their values later. Do not assume that an unlabeled number is binary just because it contains only zeros and ones.

#### Worked example

Decimal 10 and binary 10 look alike, but they do not mean the same value. Decimal 10 means one ten and zero ones. Binary 10 means one two and zero ones: decimal 2. Always read the base label.

#### Practice P1

Choose one answer for each question: Which digits are allowed in binary? Is decimal 101 a valid decimal number? What does the 4 contribute in decimal 407? Use the base label before choosing. Check your answers, then read each explanation.

#### Hint and feedback

Hint: Look at the allowed digits first. For place value, count positions from the right. Quiz explanations appear after checking; you can change your answers and check again.

#### Recap

The base controls the digits and place values. The same-looking digits can mean different values. Next, you will read binary by adding its place values.

### Author-only answer key and QA

- `p1-digits`: choices `a: 0 and 1`, `b: 1 and 2`, `c: 0 through 9`; answer `a`. Explanation: Binary has two digit symbols, 0 and 1; 2 is not a binary digit.
- `p1-valid`: choices `a: Yes`, `b: No, it must be binary`; answer `a`. Explanation: All three digits are allowed in decimal. The label establishes the interpretation.
- `p1-place`: choices `a: 4`, `b: 40`, `c: 400`; answer `c`. Explanation: 4 is in the hundreds place; the zero keeps the tens position.
- Likely mistake / feedback: Choosing 40 skips a place. Read ones, tens, hundreds from the right, including the zero.
- Retry/reset: Edit choices and check again; reload resets the practice.
- QA: `a,a,c` → all correct; `b,b,b` → all incorrect; unanswered → no correct credit. Binary `0` and `1` are valid; `2` is invalid. These boundary facts are covered in the final quiz as well.
- Sources: [S1](#sources-and-provenance) for positional binary; [S2](#sources-and-provenance) for allowed integer digits. Decimal worked examples are original arithmetic.

## Lesson L2: Read binary from right to left

- Objective / outcomes: Convert binary to decimal by summing active places; O2.
- Runtime mapping: `interactive` / `activity=null` / `error-spot`, version 1.
- Completion / persistence: Shared delivery contract.
- Sequence exceptions: None.

### Learner copy

#### Explain

A bit is one binary digit. Start with 1 at the right. Moving left, double the place value each time: 1, 2, 4, 8, 16, 32, 64, 128. A bit of 1 includes its place value; a bit of 0 contributes nothing.

#### Worked example

Read binary 00010110 with the places 128, 64, 32, 16, 8, 4, 2, 1 from left to right. The active places are 16, 4 and 2. Their sum is decimal 22. The leading zeros do not add anything.

#### Practice P2

Each card shows a binary value, its active-place sum and a claimed decimal result. Exactly one field is wrong. Select it and enter the corrected value. Use decimal digits only when correcting a decimal result.

#### Hint and feedback

Open Hint if you need help: align the rightmost bit with 1, then double as you move left. Check the selected field and your correction together. Read the explanation, then retry if needed.

#### Recap

Binary conversion is addition, not reading the digit string as decimal. The rightmost bit is the ones place.

### Author-only answer key and QA

- `p2-13`: fields `binary=00001101`, `sum=8 + 4 + 1`, `decimal=11`; error `decimal`; accepted `13`. Reason: 8 + 4 + 1 = 13.
- `p2-128`: fields `binary=10000000`, `sum=128`, `decimal=1`; error `decimal`; accepted `128`. Reason: The leftmost place in this eight-bit example is 128, not 1.
- `p2-zero`: fields `binary=00000000`, `sum=0`, `decimal=8`; error `decimal`; accepted `0`. Reason: Eight positions do not mean eight active bits.
- Each task hint: “Start at the right with 1. Include only the places with a bit of 1.” Each explanation must state the task's correct sum above.
- Likely mistake / feedback: Adding digit counts instead of place values confuses representation with value; recompute from the right.
- Retry/reset: Shared interactive behavior; no new persistence.
- QA: Correct field + expected string → correct; correct field + `12` on `p2-13` → incorrect; wrong field + `13` → incorrect; empty field/value → no success. ` 13 ` accepted; `013`, `13.0` and `0b1101` not accepted for this decimal-string exercise. Zero and the high-bit-only case are explicit boundaries.
- Sources: [S1](#sources-and-provenance). Task sums independently checked as original arithmetic.

## Lesson L3: Build an 8-bit number

- Objective / outcomes: Construct binary from a decimal target; recognize width/range; O3, O5.
- Runtime mapping: `interactive` / `activity=null` / `text-select`, version 1.
- Completion / persistence: Shared delivery contract.
- Sequence exceptions: None. Zero/range recognition is assessed through L6 quiz because Text Select requires at least one answer ID.

### Learner copy

#### Explain

To build binary, choose the place values that add to your target. Work from the largest place that fits. Choose it, subtract it, and repeat with the amount left.

Eight bits make one byte in this course. An unsigned eight-bit whole number can be 0 through 255. It has 256 possible values, because zero is included. Decimal 256 needs a ninth bit. This limit comes from the chosen width, not from binary itself.

#### Worked example

Build decimal 37. Choose 32, leaving 5. Choose 4, leaving 1. Choose 1, leaving 0. Across the places 128, 64, 32, 16, 8, 4, 2, 1, write 1 for selected places and 0 for the others: binary 00100101.

#### Practice P3

Select all place-value tiles needed to make each decimal target. Each tile is used at most once. A selected tile means 1; an unselected tile means 0. Check your selection, then read the eight-bit pattern in the explanation.

#### Hint and feedback

Hint: Choose the largest tile no greater than the amount left. The answer must contain exactly the required tiles, with no extras. You can toggle tiles and check again.

#### Recap

Read binary by adding active places. Build it by choosing those places. Width tells you how many positions are available, not how many are active.

### Author-only answer key and QA

- For each task, ordered segments are `b128: 128`, `b64: 64`, `b32: 32`, `b16: 16`, `b8: 8`, `b4: 4`, `b2: 2`, `b1: 1`. Labels are place weights, not digit values.
- `p3-19`: target 19; answer IDs `b16,b2,b1`; explanation “16 + 2 + 1 = 19. Binary: 00010011.”
- `p3-42`: target 42; answer IDs `b32,b8,b2`; explanation “32 + 8 + 2 = 42. Binary: 00101010.”
- `p3-255`: target 255; all eight IDs; explanation “All places are active: 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255. Binary: 11111111.”
- Likely mistake / feedback: An extra tile increases the value. Recalculate your total and remove places you do not need. This is author guidance; the runtime uses the shared explanation, not adaptive per-tile feedback.
- Retry/reset: Toggle answers freely; check/retry/reset; reload resets.
- QA: Exact required ID set → correct, regardless of selection order; one missing or extra ID → incorrect; no selection → request an answer. All eight selected → correct only for 255. Do not create a zero-target task with empty `answerIds`: schema disallows it.
- Sources: [S1](#sources-and-provenance) for bits and place weights. 256 values and the 0–255 range follow directly from eight binary positions.

## Lesson L4: Meet hex: sixteen digits

- Objective / outcomes: Read hex digits and convert a two-digit hex value to decimal; O1, O4.
- Runtime mapping: `interactive` / `activity=null` / `error-spot`, version 1.
- Completion / persistence: Shared delivery contract.
- Sequence exceptions: None.

### Learner copy

#### Explain

Hex has sixteen digit symbols. After 9, A means ten, B eleven, C twelve, D thirteen, E fourteen, and F fifteen. There is no hex digit G. Uppercase and lowercase A–F represent the same digit values in our exercises.

In a two-digit hex number, the left digit counts groups of sixteen and the right digit counts ones. We use the prefix 0x to label hex. For example, 0x10 means decimal sixteen, not ten.

#### Worked example

Convert 0x2D. The 2 contributes 2 × 16 = 32. D contributes 13. Add them: 32 + 13 = decimal 45.

#### Practice P4

Each card contains one wrong field. Select and correct it. For a decimal result, enter decimal digits only. Use the digit reference above until you are comfortable without it.

#### Hint and feedback

Hint: Convert each digit before applying its place value. The left digit is multiplied by 16; the right digit is not. Check your correction and read the complete calculation.

#### Recap

A–F are digit symbols, not separate variables. Hex still uses place value. Next, you will connect one hex digit to four binary bits.

### Author-only answer key and QA

- `p4-a`: fields `hex=0xA`, `decimal=11`; error `decimal`; accepted `10`. Explanation: A represents ten; B represents eleven.
- `p4-3b`: fields `hex=0x3B`, `sum=3 × 16 + 11`, `decimal=311`; error `decimal`; accepted `59`. Explanation: 48 + 11 = 59; do not concatenate 3 and 11.
- `p4-10`: fields `hex=0x10`, `sum=1 × 16 + 0`, `decimal=10`; error `decimal`; accepted `16`. Explanation: A one in the hex 16s place contributes sixteen.
- Each task hint: “Use the digit values first, then the 16s and 1s places.”
- Likely mistake / feedback: Treating hex as decimal ignores the base. Recompute the left-place contribution.
- Retry/reset: Shared interactive behavior.
- QA: Correct field + `59` → correct on `p4-3b`; `311` → incorrect; wrong field + `59` → incorrect; blank → no success. Outer spaces accepted; prefixes/fractions are not accepted for decimal corrections. Hex alphabet boundary `F` valid, `G` invalid is tested in L6.
- Sources: [S2](#sources-and-provenance) for hex notation; [S3](#sources-and-provenance) for the hexadecimal alphabet. Original arithmetic checks the examples.

## Lesson L5: Four bits make one hex digit

- Objective / outcomes: Convert binary and hex through four-bit groups; O4.
- Runtime mapping: `interactive` / `activity=null` / `error-spot`, version 1.
- Completion / persistence: Shared delivery contract.
- Sequence exceptions: None.

### Learner copy

#### Explain

Four bits have sixteen possible patterns, so each pattern fits one hex digit. A four-bit group is often called a nibble. For an eight-bit value, split the bits into two groups of four. Convert each group using the places 8, 4, 2, 1.

For a shorter binary value, add zeros on the left to complete a group. Do not add zeros on the right: that changes the value.

#### Worked example

Binary 10100111 becomes 1010 and 0111. The first group is decimal 10, or hex A. The second is decimal 7, or hex 7. Together they are 0xA7. Check with decimal: 10 × 16 + 7 = 167.

For the reverse direction, write four bits for every hex digit. Hex 0x09 becomes 0000 and 1001, giving binary 00001001.

#### Practice P5

Inspect each conversion card. Select the single wrong field and replace it. Binary corrections need exactly eight digits with no prefix or spaces. Hex corrections need 0x followed by exactly two hex digits; letter case does not matter.

#### Hint and feedback

Hint: Keep the groups in their original order. Work out each group with 8, 4, 2, 1. After checking, read the group-by-group explanation and retry if needed.

#### Recap

One hex digit represents four bits. Two hex digits can represent one byte. Grouping gives a shorter notation for the same value; it does not shrink the underlying data.

### Author-only answer key and QA

- `p5-to-hex`: fields `binary=00101101`, `groups=0010 1101`, `hex=0x2C`; error `hex`; accepted `0x2D`. Explanation: 0010 is 2; 1101 is 13, or D.
- `p5-to-binary`: fields `hex=0x5E`, `binary=01011111`; error `binary`; accepted `01011110`. Explanation: 5 becomes 0101; E (14) becomes 1110.
- `p5-leading`: fields `hex=0x09`, `decimal=9`, `eight-bit binary=1001`; error `eight-bit-binary` (stable field ID); accepted `00001001`. Explanation: 1001 has the right value but not the requested eight-bit width. Add zeros on the left.
- Each task hint: “Use one four-bit group per hex digit, and preserve group order.” All case flags false.
- Likely mistake / feedback: Swapping groups changes the places. Dropping zeros can violate a width requirement even when the numeric value is unchanged.
- Retry/reset: Shared interactive behavior.
- QA: Correct field + `0x2d` or ` 0x2D ` → correct; `2D`, `0xD2`, `0x2C` → incorrect under the prompt's format. `01011110` → correct; `0101 1110` → incorrect under no-spaces rule. `00001001` → correct; `1001` and empty → incorrect/no success. Wrong field + correct value never passes.
- Sources: [S3](#sources-and-provenance) explicitly maps four-bit groups to base16 symbols; [S2](#sources-and-provenance) supports prefix notation. Width and padding examples are original arithmetic.

## Lesson L6: Number detective

- Objective / outcomes: Apply all conversions and range checks independently; O1–O5.
- Runtime mapping: `quiz` / `activity=null` / `practice-quiz`, version 1. Do not use the legacy fixed Networking quiz.
- Completion / persistence: Shared delivery contract; score is practice-only, no passing gate, credential or secure assessment.
- Sequence exceptions: Brief refresher instead of repeating all earlier explanations.

### Learner copy

#### Explain

Check the base, check the digits, then check the place values. For an eight-bit unsigned value, also check the range and width. You can return to the earlier lessons whenever you need a method.

#### Worked example

Are decimal 18, binary 00010010 and hex 0x12 equal? Binary gives 16 + 2 = 18. Hex gives 1 × 16 + 2 = 18. They are three representations of the same value.

#### Practice P6

Choose one answer per question. Solve before checking; a calculator is not required. After checking, read the explanations for both correct and incorrect answers. Retry the questions that challenged you.

#### Hint and feedback

Optional hint: Binary places double from right to left. Hex uses groups of sixteen. For binary-to-hex, split from the right into four-bit groups. The quiz shows explanations and a practice score after checking, not a certificate or verified pass.

#### Recap

You can read, build and compare decimal, binary and hex values. Your next step could be using these place values in IP addresses or reading a byte in a programming exercise.

### Author-only answer key and QA

Use stable question IDs below; choice IDs `a`, `b`, `c` within each question. Display order deliberately varies the correct position.

| ID | Prompt | Choices a / b / c | Answer | Authored explanation |
|---|---|---|---|---|
| Q1 | Which is not a valid binary digit string? | `1010` / `1020` / `0000` | b | Binary allows only 0 and 1; 1020 contains 2. |
| Q2 | What is binary 00110100 in decimal? | 52 / 34 / 13 | a | Add the active places: 32 + 16 + 4 = 52. |
| Q3 | Which eight-bit binary pattern represents decimal 73? | `01001000` / `10010010` / `01001001` | c | 64 + 8 + 1 = 73; the ones bit must be active. |
| Q4 | What is the largest unsigned eight-bit whole number in decimal? | 256 / 255 / 128 | b | All eight places total 255. There are 256 values when zero is counted. |
| Q5 | What is hex 0x4F in decimal? | 64 / 415 / 79 | c | 4 × 16 + 15 = 79. F is fifteen, not a second decimal number. |
| Q6 | Which hex representation matches binary 11000011? | `0xC3` / `0x3C` / `0xC1` | a | 1100 is C and 0011 is 3. Preserve group order. |
| Q7 | Which hex digit is invalid? | F / A / G | c | Hex uses 0–9 and A–F. G is outside its alphabet. |
| Q8 | Which set represents the same value? | decimal 16, binary 00010000, hex 0x10 / decimal 16, binary 00001000, hex 0x10 / decimal 16, binary 00010000, hex 0x16 | a | The first set totals sixteen in each base. Binary 00001000 is eight; hex 0x16 is twenty-two. |
| Q9 | Which eight-bit binary pattern represents zero? | `00000001` / `00000000` / `10000000` | b | No place contributes when every bit is zero. |
| Q10 | Which statement is correct for unsigned eight-bit whole numbers? | 256 fits in eight bits / 00000001 and 1 have different numeric values / 256 needs at least nine bits | c | Decimal 256 is binary 100000000. Leading zeros affect width, not numeric value. |

- Normalization: Grade by stable choice IDs, not displayed text. Exactly one accepted ID per question; no numeric tolerance or free-text parsing.
- Likely mistake / feedback: Each explanation above addresses a conversion, notation, order or range misconception. Do not claim adaptive hints beyond these authored explanations.
- Retry/reset: Change choices and check again; reload/language change resets answers and score.
- QA: `b,a,c,b,c,a,c,a,b,c` → 10/10; change Q1 to `a` → 9/10 with its explanation; all unanswered → no correct credit. Q4/Q9/Q10 cover maximum, zero, leading zeros and overflow boundaries. Scores are not used to authorize completion.
- Sources: [S1](#sources-and-provenance), [S2](#sources-and-provenance), [S3](#sources-and-provenance). Answer calculations independently verified.

## Sources and provenance

- **S1:** [Harvard CS50, Lecture 0 — Computer Science and Problem Solving](https://cs50.harvard.edu/x/notes/0/#computer-science-and-problem-solving). Primary teaching reference for binary positional notation and bits. Used for factual checks; no lecture prose, tables, illustrations or exercises copied. Original course examples use different values.
- **S2:** [Python language reference — Integer literals](https://docs.python.org/3/reference/lexical_analysis.html#integer-literals). Primary language reference for binary/hex digit alphabets and the `0b`/`0x` notation used here. Python-specific syntax is not generalized to every language; this course does not teach its literal grammar.
- **S3:** [RFC 4648, Section 8 — Base 16 Encoding](https://www.rfc-editor.org/rfc/rfc4648.html#section-8). Primary reference for the base16 alphabet and its four-bit mapping. Numeric conversion is distinct from encoding an arbitrary byte sequence; this course does not imply that all encodings or file sizes shrink when displayed as hex.
- Sources opened and reviewed during draft preparation. All learner wording, exercise values and explanations are original. Source links are optional reference reading, not required prerequisites.

## Capability gaps and assumptions

- Required additional components: **None** for this draft. All six lessons fit inspected version-1 configured activities and the shared text renderer.
- Optional future **Bit Switch Lab**, not part of this draft implementation: Eight keyboard-operable toggle buttons labeled with place weights, synchronized binary/decimal/hex readouts, a target and Check/Hint/Reset. Suggested versioned contract: `kind=number-representation`, `width=8`, unsigned integer targets 0–255, display bases 2/10/16, prompt/hint/explanation per task. Check against the numeric target, allow all-off for zero, and distinguish width errors from value errors. Client-side practice only; durable attempts or score gates would require separate server work. Requires authorization, shared schema/player/Studio/translation extensions and tests before use.
- Existing Text Select tiles are selections, not live bit toggles or a synchronized converter. Their explanation supplies the resulting pattern after checking. Do not advertise the optional lab as already available.
- BM/EN delivery requires both course metadata and lesson/activity translations through Studio; protected answer IDs, technical values and grading must remain aligned. English records are published; no BM translation created yet. The current interface correctly labels content as English.
- Access policy confirmed by the owner: all lessons free, with free enrollment. No prices, orders or paid products changed.
- `bundle.ts` combines the learner-only copy with schema-validated authored configs. The scoped `scripts/publish-number-course.ts` creates drafts without overwriting and verifies stored content before explicit publication. This is not a general Markdown importer.

## Review evidence

| Gate from the standard | Result | Evidence / reason |
|---|---|---|
| Content | Pass, scoped | Outcomes linked to explicit task IDs; 27 original conversion checks plus four bundle unit tests check answer keys, reconstruction, normalization and boundaries. Primary sources reviewed; unsigned/range/width simplifications documented. Owner authorized free publication. |
| Capability | Pass, blueprint scope | Inspected `src/lib/lesson-activity.ts`, `src/lib/generic-activity.ts`, the standard and `docs/interactive-activities.md`. Lesson mappings respect configured kinds, task/choice bounds, exact-answer semantics and quiz hint limitations. No proposed required unsupported behavior. |
| Activity | Pass, scoped | Local Chromium exercises all tasks/questions, correct and incorrect attempts, empty interactive checks, hints, retry, reset and reload. Unit tests include zero, 255, nine-bit overflow, width errors, whitespace/case normalization and exact selections. |
| Experience | Pass, scoped | All six lessons checked at 320/375/768/1280px in light/dark; keyboard selection/hints exercised and recap follows practice. Fixed long back-link and resource URL overflow. Actual screen-reader, 200% browser zoom, RTL and real Safari/iOS remain Not verified. |
| Access/progress | Pass, local scope | Course-specific verified local student enrolls free, saves completion and sees it after reload; no orders created. Anonymous learner can practise but cannot mark completion. Test user and its dependent data cleaned up. No production account/progress mutation used for verification. |
| Engineering | Pass, scoped | Lint, typecheck, 137 unit/integration tests and production build passed. Two course-specific local E2Es plus six existing lesson/interface/DNS regressions passed. Stored local/remote bundle inspected before publication; no schema, env or billing changes. Production evidence recorded in README. |

## Handoff

- Files authored: Blueprint, `bundle.ts`, scoped publication script and course-specific unit/E2E tests; README records verification. Two shared lesson UI files contain the required mobile wrapping fix.
- Local Studio records created: One course, four sections and six lessons; published for local verification.
- Production records created / published: One course, four sections and six free lessons / yes, under explicit owner authorization.
- Editorial status: Approved for free publication; scoped gates passed with broader accessibility/device checks explicitly unverified.
- Next owner action: Review the live course or edit its records through Studio. BM translation and the optional Bit Switch Lab remain separate work; neither is promised as already available.
