# DV Learn

MVP pembelajaran Bahasa Melayu / Malay-first learning MVP. TanStack Start + React on Cloudflare Workers, with D1, Better Auth, Billplz and Resend.

Implemented: searchable course catalog and category URLs, course metadata/sitemap, preview lessons, verified email/password auth, password reset, profile/password settings, student dashboard, YouTube automatic progress/resume, course/section/lesson editor with drag-and-drop and numeric ordering, draft/publish/archive, HTTPS resource links, product bundles, Billplz checkout/callback/reconciliation, scoped manual access revocation, receipt retries, admin audit attempts and refund recording. UI controls and panels use shadcn/ui with Base UI, retaining the Malay-first branding and layout.

## Komponen UI

`components.json` configures the Base UI `base-vega` style for TanStack Start (no React Server Components). Shared controls in `src/components/ui` cover buttons, inputs, labels, cards, checkboxes, native selects, textareas, tables, badges, progress, alerts, empty states, avatars, accordions, tabs, category toggles, pagination, navigation, mobile sheets, dialogs, separators and spinners. Import with `@/components/ui/button`, for example. Theme tokens live in `src/styles/shadcn.css` and support the existing `data-theme="dark"` toggle. Legacy layout CSS is scoped to the components layer so shadcn utilities take precedence; decorative artwork and semantic page structure remain application-specific.

Add further components from the repository root:

```sh
npm exec --no -- shadcn add dialog
```

Review generated changes before overwriting customized components. `useActionDialog` replaces browser confirm/prompt in admin operations: cancellation never invokes the action and reasons remain validated. Automated local tests cover authentication, publishing through Base UI checkboxes/native selects, dialog cancellation, and mobile sheet/theme behavior. This migration is local until explicitly deployed.

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
| `RESEND_WEBHOOK_SECRET` | Optional private signing secret for delivery events at `/api/email/resend`. |

Better Auth requires a stable secret and correct base URL. Resend requires a verified sending domain and its DNS records before verification/reset emails can be delivered. See [Better Auth setup](https://better-auth.com/docs/installation) and [Resend domains](https://resend.com/docs/dashboard/domains/introduction).

## Pentadbir / Admin plugin

Auth follows the [Better Auth TanStack Start integration](https://better-auth.com/docs/integrations/tanstack): `/api/auth/$` mounts GET/POST handlers, browser auth uses the React client SDK, and `tanstackStartCookies()` is the final server plugin. The auth instance is created per request for Cloudflare bindings. Private server functions still enforce authentication independently of the UI.

The [Better Auth Admin plugin](https://better-auth.com/docs/plugins/admin) owns roles, bans and session administration. Database role `user` maps to the application's `student` label; `admin` grants studio access. Migration `0007_better_auth_admin.sql` preserves existing legacy admins in `user.role` and adds the plugin's ban/session fields. The old `admins` table is retained for migration history, not authorization. All seven migrations and the updated integration are deployed; apply migrations before running the app in a new environment.

No email allowlist or automatic admin promotion is used. Admin access depends only on the Admin plugin's persisted `user.role`, a verified account and an active session. Subsequent admins are managed through the studio's user panel, which supports role changes, ban/unban, and session revocation; it does not expose deletion or impersonation controls. Admin plugin HTTP endpoints also require a verified, currently authorized viewer. Course grants and payment fulfillment remain separate from user administration.

For the **first admin**, register normally and complete email verification. A trusted Cloudflare account owner then sets that specific account's role once in the correct D1 database (for example, through the D1 dashboard console). Confirm its user ID first; replace the placeholder below with that exact ID:

```sql
UPDATE user SET role='admin'
WHERE id='REPLACE_VERIFIED_USER_ID' AND email_verified=1 AND banned=0;
```

This is a private setup operation, never a public signup endpoint. It does not create an account or bypass email verification. Afterward, sign in and open `/admin`; use the plugin for further user administration. The unused `auth_bootstrap` table from migration 0007 is retained only as migration history; application code no longer reads or writes it.

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

Deployment: <https://dv-learn.eci4ever.workers.dev>. The dedicated remote `dv-learn-db` has all seven migrations applied. The TanStack/Better Auth Admin integration is deployed without an admin email allowlist. Auth uses this HTTPS origin and Billplz remains in sandbox mode. The optional Resend delivery webhook is not configured yet. Real email delivery, purchases, and authenticated Workers Free CPU performance remain unverified.

For subsequent manual deployments:

1. Run `npm exec --no -- wrangler login`; confirm the Cloudflare account and remote `DB` database/autoprovisioning configuration.
2. Set production auth origin, email settings, and Billplz mode/collection in the Worker environment. Store `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `BILLPLZ_SECRET_KEY`, and `BILLPLZ_X_SIGNATURE_KEY` using `npm exec --no -- wrangler secret put NAME`, replacing NAME with the variable name and entering the secret privately. `.dev.vars` does not provision production secrets.
3. Confirm the remote target, then run `npm run db:migrate:remote` to apply authored migrations. Back up an existing production database before schema changes.
4. Run `npm run deploy`. Complete first-admin setup above at the production origin and separately validate sandbox callbacks and email before enabling live purchases.

## Repository skills

`AGENTS.md` requires the repository's installed Intent. `@tanstack/intent` is installed as a dev dependency. Run `npm exec --no -- intent list` to discover local skills and `npm exec --no -- intent load <package>#<skill>` to load matching guidance before substantial changes.
