# DNS Fundamentals

Repository blueprint following [COURSE_STANDARD.md](../../COURSE_STANDARD.md) and [COURSE_TEMPLATE.md](../../COURSE_TEMPLATE.md). The original design specification below is retained for traceability; the implementation record at the end supersedes its original gap, access and delivery notes. The executable import manifest is [course.json](course.json), not this Markdown document.

## Brief

- Standard version: 1
- Editorial status: review-ready for the local polish revision. The originally approved course remains published; this revision has not been approved or published to production.
- Title: DNS Fundamentals
- Slug: dns-fundamentals
- Category / level: Networking / Beginner
- Audience: People who use websites but are new to DNS and domain configuration.
- Prerequisites: Recognise a web URL and know that an IP address identifies a network destination. No terminal, domain ownership or previous DNS experience is required.
- Description: Learn how domain names lead to DNS answers. Follow a lookup, choose common DNS records, predict cached results and recognise lookup failures through short explanations and practice. No videos required.
- Estimated active time: 55 minutes, including practice; an author estimate, not a measured duration.
- Delivery target: Local validation and production publication of the implemented interactive course.
- Access intention: Owner confirmed all six lessons as free public previews. No paid product or enrollment grants.
- Existing record mapping: Stable IDs are recorded in course.json; no pre-existing course is replaced.
- Scope: A simplified, offline DNS model. DNSSEC, encrypted DNS, reverse lookup, full zone-file syntax, domain registration and production DNS changes are outside this course.
- Asset provenance: Original lesson copy, fictional scenarios and proposed text-based visuals. No downloaded media or third-party artwork.

## Original design specification

References below to proposals, gaps, pending decisions and draft-only review describe the original authoring stage. They are not current runtime claims; see the implementation record for delivered capabilities and verification.

## Outcomes and coverage

| Outcome ID | Learner can… | Lesson / practice evidence |
|---|---|---|
| O1 | Separate a hostname from the other parts of a web URL | L1/P1; L6/Q1 |
| O2 | Explain the roles of a recursive resolver and authoritative servers during a cold and cached lookup | L2/P2; L6/Q2–Q3 |
| O3 | Choose A, AAAA, CNAME, MX, TXT or NS for a stated purpose | L3/P3; L6/Q4–Q5 |
| O4 | Predict a cached answer and remaining TTL in the stated simulation | L4/P4; L6/Q6 |
| O5 | Distinguish a missing name, a missing record type, a failed lookup and a timeout | L5/P5; L6/Q7–Q8 |

## Outline

“Reading fallback” means written practice and a deliberately labelled self-check, not an interactive lab. Converting to this fallback needs owner agreement; it does not deliver the proposed interactive course.

| Order | Section | Lesson ID / title | Objective | Minutes | Runtime type / activity | Preview intention |
|---|---|---|---|---|---|---|
| 1 | Names and lookups | L1 / Find the name inside a URL | O1 | 7 | Supported: reading / null | Proposed yes; owner approval pending |
| 2 | Names and lookups | L2 / Follow a DNS lookup | O2 | 10 | Gap G1: interactive / dns-resolution; reading fallback supported | Owner decision pending |
| 3 | Records and caching | L3 / Choose the right record | O3 | 12 | Gap G2: interactive / dns-records; reading fallback supported | Owner decision pending |
| 4 | Records and caching | L4 / Predict what the cache returns | O4 | 10 | Gap G3: interactive / dns-cache; reading fallback supported | Owner decision pending |
| 5 | Troubleshooting | L5 / Read the evidence before changing DNS | O5 | 8 | Supported: reading / null | Owner decision pending |
| 6 | Troubleshooting | L6 / Check your understanding | O1–O5 | 8 | Gap G4: quiz / practice-quiz; written reading fallback supported | Owner decision pending |

For every lesson, `videoUrl` would be `null`. Current supported completion is manual “Mark as complete” for a learner with course access. Only saved lesson completion persists; no authored practice response is currently collected. Proposed interactions use temporary state that resets on reload. There is no pass threshold, verified credential or automatic completion requirement.

## Shared simulation fixtures

All answers are fictional. They are not observations about live DNS for these names. Do not send lookup requests, visit the addresses, edit a DNS account or create a real email message.

Use reserved example domains and documentation IP addresses: [IANA example domains](https://www.iana.org/help/example-domains), [RFC 5737, section 3](https://www.rfc-editor.org/rfc/rfc5737.html#section-3) and [RFC 3849, section 2](https://www.rfc-editor.org/rfc/rfc3849.html#section-2).

### Fixture F1: record cards — author-only answer fixture

Do not display this complete answer table before P3. Supply the names and values through the learner prompts; reveal the type matches only in feedback or a deliberately labelled self-check. The worked example intentionally reveals R1 and R3.

| Card ID | Owner name | Type | Value | MX preference |
|---|---|---|---|---|
| R1 | app.example.com. | A | 192.0.2.10 | Not applicable |
| R2 | app.example.com. | AAAA | 2001:db8::10 | Not applicable |
| R3 | www.example.com. | CNAME | app.example.com. | Not applicable |
| R4 | example.com. | MX | mail.example.com. | 10 |
| R5 | example.com. | TXT | course-verification=demo | Not applicable |
| R6 | example.com. | NS | ns1.example.net. | Not applicable |

The simulation also supplies `mail.example.com. A 192.0.2.25` and `ns1.example.net. A 198.51.100.53` as supporting data. F1 is a teaching excerpt, not a complete deployable zone or delegation configuration.

### Fixture F2: cache scenario

- At simulated time 0 seconds, the resolver stores `app.example.com. A 192.0.2.10` with TTL 300 seconds.
- At time 120, the authoritative answer changes to `192.0.2.20`, still with TTL 300.
- The resolver keeps the original answer until expiry. It neither evicts early nor refreshes proactively; serving stale data is disabled.
- Before expiry, a query returns the cached answer. At expiry or later, the next query fetches the current authoritative answer and caches it for 300 seconds.
- Time moves forward only. If a timeline view allows moving backward, it must reset and replay the scenario; it must not carry future cache state into the past.
- This is one resolver and one record type. Other caches, negative answers, retries, multiple addresses and network delay are excluded.

## Lesson L1: Find the name inside a URL

- Objective / outcomes: Identify the hostname in a web URL; O1.
- Runtime mapping: Supported `reading / null`.
- Completion: Current manual completion; not proof that P1 is correct.
- Persistence: Written responses are not stored. Authorised lesson completion survives reload.
- Sequence exceptions: None.

### Learner copy

#### Explain

DNS stands for Domain Name System. It stores information under names. An address lookup is one use; DNS also holds other kinds of records.

A web URL contains more than a name. In `https://learn.example.com/start?mode=practice`, the hostname is `learn.example.com`. The scheme, path and query are not part of that hostname. [MDN: URI authority](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Authority).

Dots separate DNS labels. Read `learn.example.com.` from right to left to follow the hierarchy: root, `com`, `example`, `learn`. The final dot represents the root; web URLs usually omit it. [RFC 1034, section 3.1](https://www.rfc-editor.org/rfc/rfc1034.html#section-3.1).

#### Worked example

For `https://shop.example.com:8443/cart`, write `shop.example.com` as the hostname. Leave out `https://`, the port `8443` and `/cart`.

#### Practice P1

Write only the hostname from each URL:

1. `https://docs.example.com/intro`
2. `https://mail.example.org:8443/inbox?view=new`
3. `https://example.net/`

Then describe where `docs` sits in the hierarchy of `docs.example.com.`.

#### Hint and feedback

Hint: Find the name after `//`. Stop before a port, slash or query.

Feedback: If you included a path or port, remove it and identify the hostname again. Keep all of the hostname's labels; do not drop the first label just because it looks like a site feature.

#### Recap

You can identify the name being looked up without confusing it with a complete URL. Next, follow who answers a lookup.

### Author-only answer key and QA

- P1 accepted answers: `docs.example.com`, `mail.example.org`, `example.net`. `docs` is a label beneath `example.com`; `example` is beneath `com`, which is beneath the root.
- Self-check feedback: If a response includes `/intro`, remove the path. If it includes `:8443`, remove the port. If it drops `docs`, it names a different place in the tree.
- Delivery note: Written practice has no input checking or response saving. Put intentional self-check answers after the recap, clearly labelled, rather than exposing this entire QA section.
- Normalization for editorial checking: Trim outer whitespace; compare ASCII names without case sensitivity and accept one optional trailing dot. These are self-check conventions, not a new input feature or a full DNS-name validator.
- Retry/reset: Rewrite the response and compare again. No runtime reset button exists for reading.
- Correct case: URL 1 → `docs.example.com`.
- Incorrect case: `docs.example.com/intro` is not the hostname alone.
- Boundary cases: URL 3 has no extra host label; do not invent `www`. An empty response remains unanswered.
- Sources: MDN authority reference and RFC 1034 section 3.1 linked above; [RFC 1035, section 2.3.3](https://www.rfc-editor.org/rfc/rfc1035.html#section-2.3.3) for case comparison.

## Lesson L2: Follow a DNS lookup

- Objective / outcomes: Distinguish resolver work from authoritative answers; O2.
- Runtime mapping: G1 proposes `interactive / dns-resolution`, currently unsupported. A supported reading version could display the worked trace and written P2.
- Completion: Manual if implemented; no animation-end or score gating.
- Persistence: Proposed trace state and predictions reset on reload; only authorised lesson completion persists.
- Sequence exceptions: None.

### Learner copy

#### Explain

Your device asks a recursive resolver to find an answer. An authoritative server answers from the zone data it serves. A zone is an administered portion of DNS. [RFC 9499, section 6](https://www.rfc-editor.org/rfc/rfc9499.html#section-6).

When this resolver has no useful cached data, it follows referrals: root servers direct it toward a top-level domain such as `com`, and the `com` servers direct it toward the servers for `example.com`. The resolver, not your browser, follows those referrals in this model. [RFC 1034, section 5.3.3](https://www.rfc-editor.org/rfc/rfc1034.html#section-5.3.3).

#### Worked example

Our offline model looks up `app.example.com` with type A:

1. The device asks the recursive resolver.
2. The resolver asks a root server and receives a `com` referral.
3. The resolver asks a `com` server and receives an `example.com` referral.
4. The resolver asks the authoritative server for `example.com` and receives `192.0.2.10`.
5. The resolver returns that answer to the device and keeps a cached copy.

This trace deliberately omits forwarding, address discovery for name servers, query-name minimisation and error handling. It is not a packet capture.

#### Practice P2

Before viewing each next step, predict who the resolver asks next and whether the result is a referral or the final A answer. Then repeat the lookup with a valid cached A answer and predict which outside queries can be skipped.

#### Hint and feedback

Hint: A referral tells the resolver where to ask next; it is not the requested address.

Feedback: If your trace gives the root the final address, separate a referral from an answer. If your cached trace repeats the entire cold lookup, first check whether the requested answer is already available.

#### Recap

You can separate the resolver from the servers it asks and explain why a cached lookup can take a shorter path. Next, choose what kind of answer to request.

### Author-only answer key and QA

- P2 accepted cold sequence: Device → resolver; resolver → root, referral; resolver → TLD, referral; resolver → authoritative, A answer; resolver → device, A answer. The return step is not another outside lookup.
- Warm-cache answer: Device → resolver → device; this scenario makes no root, TLD or authoritative query while the cached A answer is valid.
- Validation proposal: Store the five stable step IDs, compare their order, and compare referral/answer choices by IDs. Report the first mismatch; do not match learner text to diagram labels. Empty predictions remain unanswered.
- Delivery note: Prediction checking and playback require G1. A reading fallback supplies a labelled written trace instead.
- Correct reasoning: Each referral narrows the search; the valid answer cache already contains the requested result.
- Likely mistake / feedback: Choosing “root provides the website IP” → “In this scenario the root provides a referral. Continue to the authoritative answer.”
- Retry/reset: Proposed Reset restores cold cache, first step and unanswered predictions. A new warm-cache attempt must be selected explicitly.
- QA cases: Correct sequence accepted; swapping root/TLD rejected; duplicate/missing step rejected; empty submission blocked; warm-cache mode must not animate outside queries.
- Sources: RFC 9499 section 6 and RFC 1034 section 5.3.3 linked above. F1 supplies fictional answers.

## Lesson L3: Choose the right record

- Objective / outcomes: Select six common record types for specific jobs; O3.
- Runtime mapping: G2 proposes `interactive / dns-records`, currently unsupported. The F1 table and written matching task work as reading.
- Completion: Manual if implemented; no requirement to deploy records.
- Persistence: Proposed selections and feedback reset on reload; lesson completion alone persists for authorised learners.
- Sequence exceptions: None.

### Learner copy

#### Explain

A record has an owner name, a type and a value. Choose the type for the job:

- A: an IPv4 address.
- AAAA: an IPv6 address.
- CNAME: an alias pointing to another DNS name, not a web URL.
- MX: a mail server name with a preference number; lower numbers are preferred.
- TXT: text; an application may use it for verification.
- NS: a name server for a zone.

See [RFC 1035, sections 3.3–3.4](https://www.rfc-editor.org/rfc/rfc1035.html#section-3.3) and [RFC 3596, section 2.1](https://www.rfc-editor.org/rfc/rfc3596.html#section-2.1).

#### Worked example

Give `app.example.com` the A value `192.0.2.10`. To make `www.example.com` an alias, use CNAME with value `app.example.com.`. Do not enter `https://app.example.com/start`: a DNS alias does not specify a web-page path.

#### Practice P3

Match each job to a type, then build the matching card using its supplied name and value:

1. Give `app.example.com` the IPv4 address `192.0.2.10`.
2. Give the same name the IPv6 address `2001:db8::10`.
3. Make `www.example.com` an alias of `app.example.com`.
4. Select `mail.example.com` as the mail server for `example.com` with preference 10.
5. Store the text `course-verification=demo` at `example.com`.
6. Identify `ns1.example.net` as a name server serving the `example.com` zone.

#### Hint and feedback

Hint: First decide whether the value is an address, another name or text. Mail selection also needs a preference.

Feedback: If a choice does not fit, explain the job of the record first, then inspect its value. Keep web-page details out of name-valued records. This exercise never changes real DNS.

#### Recap

You can choose a record for each job. Next, predict when another resolver might still show an older answer.

### Author-only answer key and QA

- P3 accepted types in order: A, AAAA, CNAME, MX, TXT, NS. Full accepted cards are R1–R6 in F1, including owner, value and MX preference.
- Delivery note: G2 must report the field to fix. Reading fallback reveals the answer cards only in a labelled self-check after the task; no record editor exists yet.
- Normalization proposal: Trim fields; uppercase type names; compare ASCII owner/target names without case sensitivity and with one optional trailing dot. Compare IPv4/IPv6 by parsed address value, not their display spelling. TXT payload remains case-sensitive and is compared after trimming outer whitespace; quotation marks used to display it are not part of the payload. Preference is the integer 10.
- Correct reasoning: Each F1 card satisfies its corresponding job; two address families can coexist at `app.example.com`.
- Likely mistake / feedback: MX value `192.0.2.25` → “Choose the mail server name, mail.example.com, rather than its address.” CNAME value containing `https://` or `/start` → “Use a DNS name, not a URL.”
- Retry/reset: Proposed Check validates all six cards; editing a field clears that card's previous verdict. Reset clears responses without changing F1.
- QA cases: All R1–R6 accepted; A with an IPv6 value rejected; missing MX preference rejected; `APP.EXAMPLE.COM` accepted as a name; altered TXT case rejected; equivalent expanded IPv6 accepted; empty card remains unanswered.
- Scope guard: This editor accepts only the supplied exercise jobs, not arbitrary production zone authoring. It must not permit an A/AAAA at the same owner as the CNAME card. DNSSEC metadata exceptions and provider-specific alias features are out of scope.
- Sources: RFC 1035 and RFC 3596 above; [RFC 2181, section 10.1](https://www.rfc-editor.org/rfc/rfc2181.html#section-10.1) for CNAME coexistence. F1 is an authored scenario.

## Lesson L4: Predict what the cache returns

- Objective / outcomes: Calculate remaining TTL and recognise a cached older answer; O4.
- Runtime mapping: G3 proposes `interactive / dns-cache`, currently unsupported. Written F2 calculations work as reading.
- Completion: Manual if implemented; no timer-based completion.
- Persistence: Proposed virtual clock, cache state and predictions reset on reload; authorised lesson completion persists.
- Sequence exceptions: None.

### Learner copy

#### Explain

TTL means time to live, measured in seconds. It limits how long an answer may be retained in a cache; a cache may discard it earlier. Editing authoritative data does not rewrite a previously cached answer. [RFC 9499, section 5](https://www.rfc-editor.org/rfc/rfc9499.html#section-5), [RFC 2181, section 8](https://www.rfc-editor.org/rfc/rfc2181.html#section-8).

Use F2's fixed rules for this exercise. They are a teaching model, not a promise about every browser or resolver.

#### Worked example

At time 0, the resolver caches `192.0.2.10` for 300 seconds. At time 60, its remaining TTL is `300 − 60 = 240` seconds. A lookup still uses that cached value.

#### Practice P4

Start a fresh F2 run. Query in time order at 120, 299, 300 and 301 seconds. Before each query, predict the address and remaining TTL immediately after the query. At 300, expiry is processed before looking up the answer.

At 120, the authoritative value has changed to `192.0.2.20`. Do not reset the old cache when making that change.

#### Hint and feedback

Hint: Track when the resolver stored the answer, not when someone changed the authoritative value. A successful refresh starts a new TTL.

Feedback: If your prediction changes as soon as the authority changes, inspect the cached entry's expiry. If you predicted a zero TTL after a successful refresh, calculate the new entry's expiry instead.

#### Recap

You can predict the old answer before expiry and the refreshed answer afterward. A fixed “DNS always updates everywhere after five minutes” rule would not follow from this one-cache model.

### Author-only answer key and QA

- P4 expected results, in order: t=120 → `192.0.2.10`, TTL 180; t=299 → `192.0.2.10`, TTL 1; t=300 → `192.0.2.20`, TTL 300 after refresh; t=301 → `192.0.2.20`, TTL 299.
- Delivery note: G3 shows authority and cache separately. Reading fallback uses written arithmetic and a labelled answer section; no clock controls currently exist.
- Validation proposal: Whole seconds only; exact parsed IPv4 value; trim outer whitespace; no rounding or unit conversion. A response describes state after that query, not the expired state immediately before it.
- Correct reasoning: Original expiry is t=300. The successful t=300 query stores a new answer whose expiry is t=600. Editing at t=120 does not extend original expiry.
- Likely mistake / feedback: New value at t=120 → “The authority changed, but this resolver still holds the old answer.” TTL 0 at t=300 → “This question asks after the query: an expired entry has just been refreshed.”
- Retry/reset: Reset replays F2 from t=0. A wrong prediction may be edited without moving time; advancing never silently restarts TTL.
- QA cases: Above sequence; t=0 has TTL 300; t=300 is a miss/refresh, not a valid old cache hit; a backward time request requires reset/replay; negative, fractional and empty time inputs rejected. With TTL 0 in a separate boundary fixture, every query must fetch and the result is not retained for later queries.
- Sources: RFC 9499 section 5 and RFC 2181 section 8 above. Numeric results follow F2's explicit assumptions, not measurements of real DNS.

## Lesson L5: Read the evidence before changing DNS

- Objective / outcomes: Classify a DNS observation without guessing its cause; O5.
- Runtime mapping: Supported `reading / null`; no new troubleshooting UI required for this draft.
- Completion: Current manual completion, not confirmation of a successful fix.
- Persistence: Written classifications are not stored; authorised completion persists.
- Sequence exceptions: None.

### Learner copy

#### Explain

Separate these observations:

- NXDOMAIN: the queried name does not exist in the answer's DNS view.
- NODATA: the name exists, but the requested record type is absent. This is not a separate response code; the response uses NOERROR.
- SERVFAIL: the lookup failed; that alone does not identify one cause.
- Timeout: no response arrived within the waiting period. It is not proof that the name is missing.

See [RFC 2308, sections 2.1–2.2](https://www.rfc-editor.org/rfc/rfc2308.html#section-2) and [RFC 9499, section 3](https://www.rfc-editor.org/rfc/rfc9499.html#section-3).

#### Worked example

In our fictional zone, `ipv4-only.example.com` has an A record but no AAAA record. An authoritative AAAA reply is NOERROR, contains no AAAA answer and includes the zone's SOA information: NODATA, not NXDOMAIN. SOA is a record carrying zone information; its fields are outside this course.

#### Practice P5

Classify each observation and suggest one safe next check:

1. A query for `typo.example.com` receives NXDOMAIN.
2. The worked example above returns no AAAA record.
3. A resolver returns SERVFAIL with no extra diagnostic information.
4. A request receives no reply before its timeout.

Do not run commands, change records or claim that one status proves a particular fix.

#### Hint and feedback

Hint: Was there a reply? If so, did it describe a missing name, missing type or failure?

Feedback: If you labelled every empty result NXDOMAIN, ask whether the name itself is missing or only one record type. If you guessed a repair from SERVFAIL, describe what additional evidence you need.

#### Recap

You can distinguish evidence from a guess. Next, apply the course ideas to a short self-check.

### Author-only answer key and QA

- P5 accepted classifications: NXDOMAIN; NODATA; SERVFAIL; timeout.
- Delivery note: This is written practice. Put a labelled self-check after the recap; no automatic diagnosis or text grading is available.
- Safe next checks: Recheck exact spelling/intended name; confirm the requested type and intended IPv6 support; gather more resolver/authoritative diagnostic evidence before assigning a cause; check connectivity and whether a resolver is reachable. These are investigation steps, not guaranteed repairs.
- Normalization: Editorial comparison ignores outer whitespace and classification case. Next-check wording may vary if it follows the observation and does not promise a fix. No algorithmic text grading is proposed.
- Likely mistake / feedback: “NOERROR means an address must exist” → “A query can succeed while that record type is absent.” “SERVFAIL means typo” → “A failure status alone does not establish a missing name.”
- Retry/reset: Rewrite the classification; no runtime reset button.
- QA cases: Worked AAAA response is NODATA; NXDOMAIN case is not merely an absent AAAA; timeout is not a DNS response code; empty response remains unanswered. An empty NOERROR answer with a delegation referral must not be labelled NODATA based only on emptiness.
- Sources: RFC 2308 sections 2.1–2.2 and RFC 9499 section 3 above. Scenarios are original; no real lookup was performed.

## Lesson L6: Check your understanding

- Objective / outcomes: Apply O1–O5 to new prompts.
- Runtime mapping: G4 proposes `quiz / practice-quiz`, currently unsupported. Existing `quiz / quiz` is a fixed IP-address bank and is not a DNS quiz. A supported reading fallback could present these questions and an intentional answer section.
- Completion: Manual regardless of score; no pass gate, credential or access unlock.
- Persistence: Proposed answers, feedback and score reset on reload; authorised completion persists.
- Sequence exceptions: Assessment-only lesson; explanations and worked examples are in L1–L5.

### Learner copy

Answer all eight questions. Each has one best answer. Choose Check answers to read the explanations, including those for correct choices. Use Reset to try again after reviewing the matching lesson.

Hint: Separate the name from the URL, referrals from answers, and the authoritative value from the cached value.

#### Practice P6

1. **Q1:** What is the hostname in `https://support.example.org:8443/help`?
   - A. `https://support.example.org`
   - B. `support.example.org`
   - C. `support.example.org:8443/help`
   - D. `example.org/help`
2. **Q2:** Who follows referrals in our cold-lookup model?
   - A. The website's page renderer
   - B. The recursive resolver
   - C. The TXT record
   - D. The mail server selected by MX
3. **Q3:** With a valid cached answer, what happens in our warm-lookup model?
   - A. The resolver must query the root again
   - B. The resolver deletes the answer before using it
   - C. The resolver answers without root, TLD or authoritative queries
   - D. The browser edits the authoritative zone
4. **Q4:** Which record type stores `2001:db8::10` as a host address?
   - A. MX
   - B. TXT
   - C. A
   - D. AAAA
5. **Q5:** Which value belongs in a CNAME pointing to `app.example.com`?
   - A. `https://app.example.com/start`
   - B. `app.example.com.`
   - C. `192.0.2.10`
   - D. `10 app.example.com.`
6. **Q6:** In a fresh F2 run, what does a query at t=299 return?
   - A. `192.0.2.10` with 1 second remaining
   - B. `192.0.2.20` with 1 second remaining
   - C. `192.0.2.10` with 300 seconds remaining
   - D. `192.0.2.20` with 300 seconds remaining
7. **Q7:** An authoritative reply confirms an existing name has no requested AAAA record. Its code is NOERROR. What is this result called?
   - A. NXDOMAIN
   - B. Timeout
   - C. NODATA
   - D. An HTTP redirect
8. **Q8:** A resolver returns SERVFAIL without further details. What is justified?
   - A. The hostname is definitely misspelled
   - B. The website definitely needs a new A record
   - C. The lookup failed; gather more evidence about the cause
   - D. The name definitely does not exist

#### Recap

Explain one lookup step, one record choice and one cache prediction in your own words. Review the matching lesson for any missed question. This self-check is practice, not a verified assessment.

### Author-only answer key and QA

| Question | Correct choice ID | Feedback / reasoning | Outcome |
|---|---|---|---|
| Q1 | B | Leave scheme, port and path out of the hostname. | O1 |
| Q2 | B | The recursive resolver follows referrals in this model. | O2 |
| Q3 | C | A valid cached answer removes the need for those outside queries here. | O2 |
| Q4 | D | AAAA carries the IPv6 address; A carries IPv4. | O3 |
| Q5 | B | A CNAME value is the target name, not a URL, address or MX-style preference. | O3 |
| Q6 | A | Original expiry is t=300, so the old cached value has one second left. | O4 |
| Q7 | C | Missing type at an existing name is NODATA, not missing-name NXDOMAIN. | O5 |
| Q8 | C | SERVFAIL alone does not prove a specific cause. | O5 |

- Validation proposal: Eight stable question IDs; four stable choice IDs per question; one selected choice per question. Compare IDs, not choice positions or labels. Unanswered or unknown IDs are invalid, not silently correct. No free-text normalization is needed.
- Delivery note: The quiz instructions above target proposed G4, not the current fixed IP quiz. A reading version must instead ask learners to record choices and compare with labelled answers after finishing; it must not promise Check/Reset controls.
- Score: One point per correct choice; display `correct / 8`. No pass percentage. Correct sequence: B, B, C, D, B, A, C, C.
- Feedback: Show correctness and the table's explanation for every question after checking. Changing a choice clears stale feedback and requires checking again. Wrong answers should link to the mapped lesson.
- Retry/reset: Proposed Reset clears choices, feedback and score. No attempt records or retry limits.
- QA cases: All correct → 8/8; Q1=A with the others correct → 7/8; all eight deliberately wrong → 0/8; seven answers → Check disabled; unknown choice ID rejected; Reset clears all eight choices; reordered options retain grading by IDs.
- Sources: The primary references cited in L1–L5 support the concepts. Questions and distractors are original course content, not copied examination material.

## Capability gaps and assumptions

### Current supported delivery

All six lessons can be authored as plain-text reading with written practice and labelled self-checks. That is an alternative delivery mode, not the interactive experience proposed above. Markdown tables, rich diagrams, disclosure widgets and executable content cannot be pasted into `content` expecting them to render as authored. Adapt learner copy and include only intentional self-check answers; do not copy author-only QA into the learner record.

No DNS activity ID, question payload, activity configuration field, saved attempt or score-based completion exists in the inspected contracts. The fixed IP quiz and IPv4 explorers must not be reused as if they were DNS activities.

### Additional interactive components required

All four are **proposed**, not built. Keep their exercise data separate from shared behaviour. Use deterministic local simulation; no DNS provider credentials, live DNS traffic, arbitrary code execution or new external service is needed for the described practice.

| Gap | Proposed reusable component | Smallest data contract | Feedback and completion | Existing UI building blocks |
|---|---|---|---|---|
| G1 | DNS resolution walkthrough | Version; scenario ID; query name/type; cold/warm cache mode; stable role and step IDs; ordered expected steps; referral/answer labels; fictional result | Step predictions, first-mismatch explanation, Reset. Manual lesson completion; temporary state only | Card, Button, NativeSelect, Badge, Progress, Alert |
| G2 | DNS record practice | Version; task IDs/prompts; allowed record types; supplied names/values; expected cards; MX preference where applicable; per-field hints | Field validation, correct reasoning and actionable mistakes. Manual completion; temporary selections only | Card, Input, Label, NativeSelect, Table, Alert |
| G3 | DNS cache timeline | Version; query name/type; initial answer; TTL; authority-change events; fixed cache rules; requested virtual query times | Prediction before reveal; cached/authoritative values; remaining TTL; hit/refresh explanation; Reset. Manual completion; temporary state only | Card, Button, Input, Progress, Badge, Alert |
| G4 | Configurable practice quiz | Version; question IDs/prompts; stable choice IDs/text; correct choice IDs; explanations; mapped lesson IDs; optional hints | Eight-question check, score, explanations and retry. Manual completion, no credential or saved attempts | Card, Label, Button, Progress, Alert; add a shadcn/Base UI Radio Group only if needed |

These contracts are restricted declarative data, not executable scripts or unrestricted HTML. Client-visible answer keys are acceptable for this practice, not secure proof of passing.

Implementation would also require a validated, versioned lesson activity payload and persistence mapping; corresponding contract/schema/migration changes are not included in this draft. Extend Studio editing, server validation, publish readiness and both learner/preview rendering together. Keep existing lessons compatible and use a shared lesson/activity rendering seam rather than separate DNS-specific branches in each caller.

Relevant implementation paths inspected:

- [Contracts](../../src/server/contracts.ts), [validation](../../src/server/validation.ts), [lesson readiness](../../src/lib/lesson-readiness.ts) and [course publishing](../../src/server/publishing.ts).
- [Learner player](../../src/components/platform.tsx), [Studio preview](../../src/components/studio/lesson-preview.tsx), [Studio lesson editor](../../src/components/studio/lessons.tsx) and [existing IP lab](../../src/components/ip-address-lab.tsx).

Keyboard users must be able to operate every step and choice without dragging. Announce checking results, keep hints readable without hover, retain visible focus, and avoid real-time waiting for TTL practice. Use site tokens and existing shadcn components. These are implementation acceptance criteria, not verified behaviours.

### Assumptions and decisions

- Beginner suitability and the 55-minute estimate need owner/learner review.
- L1 preview and remaining access policy are proposals; no product, price or grant is implied.
- The scope is content authoring. Building G1–G4, importing a course, creating local/remote records or publishing needs separate direction.
- No pass-gated completion or durable attempts are needed for the proposed MVP. Any later requirement must be specified, implemented and verified; server-side validation is required for access/credential claims.

## Review evidence

| Gate from the standard | Result | Evidence / reason |
|---|---|---|
| Content | Pass | Outcomes map to P1–P6; source definitions reviewed; hostname examples, F1 mappings, F2 arithmetic and quiz answer IDs checked. Owner approval and learner trial remain pending. |
| Capability | Pass | Each lesson explicitly identifies a supported mapping or G1–G4; contracts, validation, readiness, Studio and player inspected. Pass means the mapping is honest, not that the proposed labs exist. |
| Activity | Not verified | No DNS interactions instantiated or browser-tested. Author-level arithmetic/answer checks do not demonstrate runtime behaviour. |
| Experience | Not verified | No rendered course; keyboard, light/dark and 320px/375px/768px/desktop checks remain for implementation. |
| Access/progress | Not verified | No course records, preview flags, access grants or progress records created; no runtime verification performed. |
| Engineering | Not applicable | Content-only file added; no application code, dependency, migration or deployment changed. Document checks are reported at handoff. |

## Handoff

- Files authored: `courses/dns-fundamentals/COURSE.md` only for this request.
- Records created: None, locally or remotely.
- Published: No.
- Document verification: Local links checked; six lesson sections and 55-minute outline confirmed; six record cards, four cache predictions and eight quiz answer IDs checked, including 8/8, 7/8 and 0/8 scoring examples. No runtime interaction tests performed.
- Editorial status: Draft; ready for owner content review, not owner-approved.
- Actual runtime behaviour: Reading fallback is supported; G1–G4 remain unsupported. Completion is manual; only authorised lesson progress persists, not practice answers or scores.
- Release readiness: Blocked for the proposed interactive delivery until G1–G4 and the corresponding activity data path are implemented and runtime review gates pass.
- Next owner action: Review the draft and access intention, then choose whether to authorise the interactive implementation or explicitly accept a reading/self-check fallback. No production action follows from this blueprint alone.

## Implementation record — 5 October 2026

This record supersedes the original draft-only handoff and gap analysis above. The owner approved implementation/publication and explicitly confirmed that every lesson should be a free public preview.

- Editorial status: Approved. Runtime delivery: local and production course records, published.
- Production: https://learn.nimfi.dev/courses/dns-fundamentals
- Course ID/slug: `dns-fundamentals`. Sections: `dns-names`, `dns-records`, `dns-troubleshooting`.
- Ordered lesson IDs: `dns-names-url`, `dns-lookup`, `dns-record-practice`, `dns-cache-practice`, `dns-troubleshoot`, `dns-self-check`.
- Six lessons, estimated 55 active minutes, plain English, no video. All published lessons have `preview=true`. No product, purchase or enrollment grant was created.
- G1–G4 are implemented in a shared renderer and validated version 1 activity JSON stored in the additive `activity_config` column. New configured kinds use `activity=null`; legacy IP lessons remain compatible. Studio can select, edit, save and preview configured practice.
- Lookup practice predicts a recipient and step result sequentially, rather than dragging a complete sequence. Cold mode has five stages; warm mode has two. Check explains the correct stage; Reset clears the walkthrough. This models combined query/response stages, not a full packet trace.
- Record practice checks six cards and gives field-specific corrections. Editing clears checked feedback; Reset clears inputs. Cache practice checks four forward-only queries and shows cache, authority and remaining TTL; Reset replays from t=0. No live DNS requests are sent.
- Quiz uses eight stable question/choice IDs, Check answers, score, explanations, keyboard-operable radio choices and Reset quiz. Review guidance names the relevant lesson in explanations; no dedicated mapped-lesson link or optional hint widget was added.
- Written P1/P5 remain intentional reading/self-check activities. Practice answers and scores are component state and reset on reload. Completion is manual, independent of practice score, saved only for verified accounts with course access. No pass gate, durable attempts or credential is claimed.

| Gate | Current result | Implementation evidence |
|---|---|---|
| Content | Pass | Reviewed outline carried into plain-text manifest; six records, four TTL predictions and eight answer keys checked; bundle passes publish validation. Time is still an estimate, not a learner measurement. |
| Capability | Pass | Four configured activities implemented; nullable migration 0009, schema/contract/SQL/readiness/Studio/learner path extended together. |
| Activity | Pass | Unit tests cover malformed/versioned payloads, wrong records, name/IPv6 normalization, MX/TXT boundaries, zero TTL, expiry boundary and ID grading. Browser test exercises all four activities, feedback and reset. |
| Experience | Pass | Chromium reflow checks at 320/375/768/1280 in light/dark; quiz keyboard selection; mobile record/light and quiz/dark screenshots visually inspected. Native inputs/selects are used without drag or hover-only interaction. |
| Access/progress | Pass | Integration verifies configured public serialization and draft protection. Local browser checks anonymous completion disabled, draft course hidden, authenticated completion/resume after reload; test accounts/records cleaned up. Production draft was confirmed hidden before publication. |
| Engineering | Pass | Typecheck, production build, 81 tests across 12 unit/integration files and final sequential run of all 3 local browser checks (DNS, learning progress, Studio authoring) pass. Production DNS browser check also passes. Biome exits successfully with existing CSS warnings and one template-style suggestion in new runtime code. |

Deployment version: `98f60968-799b-4602-b4ce-8ebdcaf6701a`. Database backup before migration: `/Users/mac2/Desktop/dv-learn-dns-backup-20261005.EKaTYU/remote.sql` (restricted file permissions). Production DNS browser test passes all six public lessons and all four configured activities, feedback/reset, quiz reload and responsive themes without page errors. Final production counts: 1 published course, 6 published free-preview lessons, 4 configured activities, 0 videos, 0 products, 0 access grants, 2 existing users and 1 admin. Foreign-key check returns no violations.

## Local polish revision — 5–6 October 2026

Status: review-ready, not a production update. The current learner copy for review is in `course.json`; the earlier lesson-by-lesson prose above is the original blueprint. Five lesson bodies now use shorter explanations, earlier definitions and numbered practice instructions. L1 includes a short orientation; L2 distinguishes a query/response stage from a packet and defines A/TLD before practice; L3 defines owner/value; L4 explains cache/authority before TTL prediction; L5 explains the responding server's view in plain English. Answer keys, IDs, estimates, outcomes and free-preview policy are unchanged.

The shared renderer now exposes section headings, moves recap below practice, and puts explicitly labelled written self-check answers in the existing shadcn/Base UI accordion. Resources have descriptive labels without changing source destinations. Practice keeps site typography tokens (18px reading, 16px controls, 44px input/button height); long URLs and choices wrap without clipping. Record feedback is specific to the expected type; lookup feedback distinguishes a wrong recipient from a wrong result. These are client presentation changes, not new progress or assessment rules.

### Writing review — plain language and action names

| Severity | Location | Before | After | Why |
|---|---|---|---|---|
| MEDIUM | `course.json`, L2–L5 | Terms introduced late; practice instructions buried in prose | Early definitions and numbered actions; lookup stages explicitly combine query/reply | Beginners can follow the controls without guessing the vocabulary or model |
| MEDIUM | `src/lib/lesson-activity.ts`, record feedback | Generic address-family message also mentioned TXT | Type-specific IPv4, IPv6, target-name or case-sensitive text guidance | The correction names the field format actually required |
| LOW | `src/components/lesson-body.tsx`, resources | Long raw source URLs as link text | RFC/section, MDN and IANA destination labels; no conflicting hero `underline` class | Source links remain meaningful and in normal flow after recap |

### Typography and structure review

| Severity | Location | Before | After | Why |
|---|---|---|---|---|
| MEDIUM | `src/components/lesson-body.tsx`, reading | One long preformatted article; inline answer reveal | Real section headings and paragraphs; explicit closed self-check | Easier scanning and heading navigation without exposing answers before practice |
| MEDIUM | `src/styles.css`, practice | Tight controls; quiz URL choices could overflow inside fieldsets | 44px controls, 16px labels/inputs, constrained grid tracks and wrap-anywhere for long tokens | Readable mobile interaction and no clipped choices |
| LOW | `src/components/lesson-activity.tsx`, counters | Proportional changing digits | Tabular digits on question, step and query counters | Stable width while progressing |

Verification: manifest passes publish validation; typecheck and unit tests cover parser conventions, literal legacy text, resource names and existing activity grading. Chromium tests cover self-check Enter/expanded-state, all activity feedback/reset, inner fieldset reflow and page reflow at 320/375/768/1280 in both themes. Studio renders all six revised lesson bodies as unsaved draft previews in an isolated local fixture. Existing progress/resume and draft protection remain covered. Full screen-reader testing, iOS Safari zoom and an automated accessibility audit are Not verified; this is not a claim of full accessibility compliance. No HIGH finding remains in inspected writing/typography; scoped review: Approve for owner review.

Final check on 6 October: 85 unit/integration tests in 13 files pass; typecheck and production build pass. All 3 local browser checks pass, including real `data-theme` switching, source links staying below recap, all six revised copies in Studio preview, and saved learning progress. Reduced-motion users receive a non-animated self-check disclosure. No production verification is claimed for this unpublished polish revision.

Delivery boundary: shared UI changes are visible on localhost. Revised manifest wording has not replaced the normal local course records or production records; the Studio tests use and clean isolated fixtures. No remote database, deployment, billing, enrollment, commit or push action is part of this polish revision. Next action: review locally, then explicitly authorize synchronization of the reviewed wording and deployment/publication to production. The draft-only create importer must not be rerun as an overwrite.
