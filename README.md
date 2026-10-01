# DV Learn

MVP pembelajaran Bahasa Melayu / Malay-first learning MVP. TanStack Start + React on Cloudflare Workers, with D1, Better Auth, Billplz and Resend.

Implemented: searchable course catalog and category URLs, course metadata/sitemap, preview lessons, verified email/password auth, password reset, profile/password settings, student dashboard, YouTube automatic progress/resume, course/section/lesson editor with drag-and-drop and numeric ordering, draft/publish/archive, HTTPS resource links, product bundles, Billplz checkout/callback/reconciliation, scoped manual access revocation, receipt retries, admin audit attempts and refund recording. The UI uses custom accessible components; shadcn/ui has not been added.

Refund recording does **not** transfer money. Process the refund through Billplz/bank first, then use the admin record action. It revokes only grants from that order and retains unrelated purchase/manual grants. Bill creation with an ambiguous network failure remains blocked for support reconciliation rather than risking duplicate bills.

## Persediaan tempatan / Local setup

Use Node supported by the installed Vite/Wrangler versions and npm. From the repository root:

```sh
npm install
cp .dev.vars.example .dev.vars
```

Isi `.dev.vars` sendiri / Fill `.dev.vars` privately. The example contains names only. Set `BETTER_AUTH_URL` to the local app origin on port **3002**, and generate a strong `BETTER_AUTH_SECRET` of at least 32 characters. Never commit `.dev.vars` or paste credentials into logs/issues.

```sh
npm run db:migrate
npm run cf:types
npm run dev
```

Open <http://localhost:3002>. `DB` is the D1 binding. Authored SQL migrations live in `migrations/`; no drizzle-kit generation is required. `db:migrate` applies pending migrations to local D1 only. Local use needs no database ID; Wrangler manages local storage/autoprovisioning. Local state persists under `.wrangler/`; local and remote databases are separate. If tables are missing, apply local migrations first.

## Pemboleh ubah / Environment

| Name | Purpose / Kegunaan |
| --- | --- |
| `BETTER_AUTH_SECRET` | Private Better Auth signing/encryption secret. |
| `BETTER_AUTH_URL` | Exact app origin for auth links; local port 3002, HTTPS in production. |
| `RESEND_API_KEY` | Private Resend sending key. |
| `EMAIL_FROM` | Sender address on a verified Resend domain. |
| `EMAIL_REPLY_TO` | Reply destination. |
| `EMAIL_SUPPORT` | Support contact address. |
| `EMAIL_BRAND_NAME` | Brand displayed in email. |
| `BILLPLZ_SECRET_KEY` | Private Billplz API credential. |
| `BILLPLZ_X_SIGNATURE_KEY` | Private callback signature key. |
| `BILLPLZ_COLLECTION_ID` | Collection for the selected Billplz environment. |
| `BILLPLZ_MODE` | Environment selector; use sandbox in development. |
| `ADMIN_EMAIL` | Nonsecret bootstrap email; empty Wrangler default, overridden locally in `.dev.vars`. |
| `RESEND_WEBHOOK_SECRET` | Optional private signing secret for delivery events at `/api/email/resend`. |

Better Auth requires a stable secret and correct base URL. Resend requires a verified sending domain and its DNS records before verification/reset emails can be delivered. See [Better Auth setup](https://better-auth.com/docs/installation) and [Resend domains](https://resend.com/docs/dashboard/domains/introduction).

## Pentadbir / Admin bootstrap

Set `ADMIN_EMAIL`, register that account, and complete email verification. **The signed-in account must have a verified email matching `ADMIN_EMAIL`.** Then open `/admin`; the server bootstraps admin membership when resolving that verified viewer. A different or unverified email must not qualify. The empty default bootstraps nobody. Existing admin membership is persistent: changing `ADMIN_EMAIL` is not a revocation mechanism.

Registration and verification may send real email when Resend is configured. These are manual setup steps, outside the smoke suite. Do not bypass verification by editing cookies or database flags.

## Pembayaran / Payments

Use Billplz sandbox API credentials, collection, and signature key together; production needs its own matching set. Provider callbacks require a reachable public HTTPS origin; localhost is not reachable from Billplz. Access must depend on a validated callback/server payment check, not merely a browser return. See the [Billplz sandbox API](https://support.billplz-sandbox.com/api).

`BILLPLZ_MODE` accepts `sandbox` or `live` (`production` is also accepted). The backend supplies `/api/payments/billplz` as the POST callback and `/orders` as the browser return. Better Auth is mounted at `/api/auth/$` (for example `/api/auth/sign-in/email` and `/api/auth/get-session`). Application reads and mutations are TanStack Start server functions in `src/server/functions.ts`; their generated transport URLs are not hand-authored REST endpoints.

Smoke tests do not create bills, purchase courses, register accounts, or send email. Full paid E2E, webhook delivery, receipt email, and production payments are **not verified** by these tests.

The optional Resend webhook verifies Svix signatures and tracks delivery events. Configure its URL and signing secret in Resend to distinguish an accepted email from delivery/bounce. Without it, receipt status tracks the sending API only. Do not automatically resend bounced messages.

## Ujian / Testing

```sh
npm run typecheck
npm test
npm exec --no -- playwright install chromium
npm run test:e2e
```

For the authenticated local learning/admin suite, run `PLAYWRIGHT_ALLOW_LOCAL_FIXTURES=1 npm run test:e2e` with the local origin aligned to `BETTER_AUTH_URL`. This creates uniquely named synthetic users/courses in local D1 and removes exactly those fixtures afterward. It sends no provider email or payment request. The YouTube API is simulated for autosave/resume verification; real video playback still needs a browser check with your videos.

Vitest uses `vitest.config.ts`; Playwright uses `playwright.config.ts` and `tests/e2e/`. Apply local migrations and configure local auth first. Playwright reuses a compatible existing server on port 3002 locally, or starts `npm run dev` when none exists; it does not stop your existing process. CI requires its own server on that port. Tests use fresh anonymous sessions, block external browser requests and browser requests that mutate state, and accept the real empty catalog without seeding fake courses. Leave Resend/Billplz credentials empty for smoke tests: browser interception cannot prevent server-side outbound traffic. Provider-backed flows need separate sandbox validation.

Inspect failures with `npm exec --no -- playwright show-report`. Keep reports/traces private because they may contain application data.

If port 3002 belongs to another app, leave that process running. Start this checkout on another local port and explicitly target it, for example `PLAYWRIGHT_BASE_URL=http://localhost:3003 npm run test:e2e`. This override is for read-only smoke checks; keep the normal auth origin on port 3002, and align `BETTER_AUTH_URL` with the running app before testing auth submissions/callbacks. A running server must serve this checkout, not merely answer HTTP requests.

## Workers Free / Manual deployment

Workers Free + D1 is the MVP target, subject to [Workers quotas](https://developers.cloudflare.com/workers/platform/limits/) and [D1 Free quotas](https://developers.cloudflare.com/d1/platform/pricing/). Billplz transactions, email, domains, and video hosting have separate costs/limits. Video URLs should point to externally hosted media.

Authentication currently uses a custom WebCrypto PBKDF2-SHA256 password hash with 100,000 iterations and a random salt. Local auth tests do not establish production Workers Free CPU suitability or a production password-security review. Benchmark auth on the deployed Worker and review the hashing policy before launching publicly; do not reduce its cost just to fit a CPU quota.

Deployment is manual and has not been performed as part of this setup:

1. Run `npm exec --no -- wrangler login`; confirm the Cloudflare account and remote `DB` database/autoprovisioning configuration.
2. Set production auth origin, email settings, Billplz mode/collection, and `ADMIN_EMAIL` in the Worker environment. Store `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `BILLPLZ_SECRET_KEY`, and `BILLPLZ_X_SIGNATURE_KEY` using `npm exec --no -- wrangler secret put NAME`, replacing NAME with the variable name and entering the secret privately. `.dev.vars` does not provision production secrets.
3. Confirm the remote target, then run `npm run db:migrate:remote` to apply authored migrations. Back up an existing production database before schema changes.
4. Run `npm run deploy`. Complete verified admin bootstrap at the production origin and separately validate sandbox callbacks and email before enabling live purchases.

## Repository skills

`AGENTS.md` requires the repository's installed Intent. During this setup `npm exec --no -- intent list` reported `@tanstack/intent` missing; no replacement was downloaded.
