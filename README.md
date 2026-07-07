# Sophisticated Sips — Production Web App

> **Before launch:** STAGING.md — Amy tests on a private preview (fake payments, rerouted emails, staging banner) before anything goes live.
> **New owner or handing over?** Start with OWNER_TRAINING.md (daily operation), the in-app Setup Wizard at `/owner/setup`, and TRANSFER.md (selling/transferring the business).

Luxury mobile espresso catering site + AI concierge + owner dashboard + outreach approval workflow + Stripe deposits.

Next.js 15 (App Router) · Supabase (Postgres + Auth + RLS) · Resend · Square · Anthropic (server-side only)

## Architecture at a glance

| Concern | Where | Security |
|---|---|---|
| AI Concierge | `POST /api/ai-concierge` | API key server-only, input validated/capped |
| Growth ideas | `POST /api/growth-ideas` | Owner session required |
| Bookings | `POST /api/bookings` → `booking_requests` + auto `leads` | Honeypot + validation, service role server-side |
| Owner dashboard | `/owner` | Middleware: session email must equal `OWNER_EMAIL`; RLS `is_owner()` on every table |
| Outreach | draft → **Amy approves** → send | Suppression list checked, ≤3 follow-ups, signed unsubscribe link + `List-Unsubscribe` header |
| Follow-up drafting | daily cron `/api/cron/followups` | `CRON_SECRET` bearer; only *drafts*, never sends |
| Payments | `/api/square/*` (payment link, invoice, status, webhook) | Owner-only creation; HMAC webhook signature verified |
| AI Secretary | `/api/ai-secretary/daily-summary`, `/api/ai-secretary/draft-email` | Owner session required; drafts only, suppression checked at draft time |

## Setup (~30 minutes)

### 1. Supabase
1. Create a project at supabase.com.
2. SQL Editor → paste and run `supabase/schema.sql`. **Edit the `insert into owners` line to Amy's real email first.**
3. Authentication → Users → *Add user* → create Amy's login (same email) with a strong password. Disable public signups (Auth → Providers → Email → turn off "Allow new users to sign up").
4. Copy Project URL, anon key, and service role key into `.env.local`.

### 2. Environment
```
cp .env.example .env.local   # fill everything in
```
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `UNSUBSCRIBE_SECRET`, and `CRON_SECRET` are server-only — never prefix them with `NEXT_PUBLIC_`.

### 3. Resend (email)
1. Add and verify the sending domain (sophisticatedsips.com) — SPF + DKIM records.
2. Create an API key. Set `OUTREACH_FROM` to a real address on that domain.

### 4. Square
1. developer.squareup.com → create an app. Start in **Sandbox**: copy the sandbox access token and a location ID into `.env.local` (`SQUARE_ENVIRONMENT=sandbox`).
2. After deploy: app → Webhooks → add subscription with notification URL `https://YOURDOMAIN/api/square/webhook`, events **payment.updated** and **invoice.payment_made**. Copy the signature key to `SQUARE_WEBHOOK_SIGNATURE_KEY`.
   - The notification URL must match `NEXT_PUBLIC_SITE_URL` exactly — the HMAC check includes it.
3. Money flow in the dashboard: Confirm lead → event created (25% deposit) → **Deposit link** (hosted Square checkout, auto-copied) → once deposit is paid, **Send balance invoice** (Square emails it) → webhook or the **Check payment** button marks things paid.
4. Go live: switch to the production token, location, and `SQUARE_ENVIRONMENT=production`, and recreate the webhook in production.

> Migrating an existing database from the earlier Stripe version? Run `supabase/migrations/002_square.sql`.

### 5. Photos
Drop Amy's real photos into `public/gallery/`, named like `01 - Golden hour trailer.jpg`.
The filename (minus the number prefix) becomes the caption automatically.

### 6. Run / deploy
```
npm install
npm run dev        # http://localhost:3000
```
Deploy on Vercel: import the repo, paste the env vars, done. `vercel.json` already schedules the daily follow-up drafter (set `CRON_SECRET` in Vercel too).

## Compliance model (built in, not bolted on)
- **Nothing sends without Amy's click.** Drafts (including cron-generated follow-ups) sit in the Approval Queue until approved.
- **Opt-out is permanent.** Every outreach email carries a signed unsubscribe link and a `List-Unsubscribe` header. Clicking it adds the address to `suppression_list`, kills pending drafts, and marks the lead declined. The send endpoint re-checks suppression on every approval.
- **Follow-ups cap at 3** per lead and stop on decline.
- **Booking receipts** are transactional (customer-initiated), so they don't carry marketing opt-out.
- CAN-SPAM also requires a valid physical postal address in commercial email — add Amy's business address to the footer in `src/lib/email.ts` before real outreach.

## What's intentionally NOT here
- No scraping. The "lead finder" concept from the MVP is deliberately manual-first: Amy (or a future reviewed integration) adds public opportunities as leads; the AI drafts and scores. Anything automated should stick to legal public sources and the same approval gates.
- No client-side AI keys, anywhere.
