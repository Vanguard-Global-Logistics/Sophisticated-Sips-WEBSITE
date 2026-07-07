# Sophisticated Sips v4 — Launch Verification & Deployment Guide

Purpose: prove the build works end-to-end, then ship it. (Recommended flow: run this against the STAGING environment first — see STAGING.md — then repeat the production-only steps at go-live.) No new features. Work through Parts A–F in order; the PASS/FAIL checklist at the bottom is your launch gate.

Time estimate: ~2 hours for a careful first pass (most of it waiting on DNS/domain verification for email).

---

## PART A — Get it building

### Step 1. Open the project in Codespaces
1. Create a **private** GitHub repo (it will hold business logic — never make it public).
2. Unzip `sophisticated-sips-v4-platform.zip` locally or upload the files via github.com → "Add file → Upload files" (works from iPhone Safari).
3. Confirm `.gitignore` is present at the repo root **before** you ever create `.env.local`.
4. Repo page → green **Code** button → **Codespaces** tab → **Create codespace on main**.
5. Wait for the terminal prompt. You're in Ubuntu with Node preinstalled.

### Step 2. Install dependencies
```bash
npm install
```
Expected: finishes with no `ERESOLVE` errors. Warnings about deprecated sub-dependencies are fine.
If Square's SDK complains about the Node version, run `node -v` — you want Node 20+ (Codespaces default is fine).

### Step 3. Typecheck
```bash
npm run typecheck
```
Expected: **exits silently with code 0.** With node_modules installed, the type-inference noise I saw in the sandbox disappears. Any error that prints here is real — paste it to me before continuing.

### Step 4. Build
```bash
npm run build
```
Expected: "Compiled successfully", then a route table listing `/`, `/catering`, `/menu`, `/gallery`, `/about`, `/book`, `/owner`, `/owner/login`, and ~12 `/api/*` routes.
Note: pages that query Supabase at build time will warn or render fallbacks until env vars exist — that's fine at this step. Re-run the build after Step 6 for a clean pass.

### Step 5. Tests
```bash
npm test
```
Expected: **5 passing** across 2 files — unsubscribe token round-trip, tamper rejection, garbage rejection, valid Square webhook signature accepted, invalid/missing signature rejected. These are the two security-critical HMACs; if either fails, stop.

---

## PART B — Services

### Step 6. Environment variables
```bash
cp .env.example .env.local
```
Fill every line. Reference:

| Variable | Where it comes from | Gotcha |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | These two are the ONLY safe-for-browser values |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, "service_role" | Server-only. Treat like a root password |
| `OWNER_EMAIL` | Amy's real login email | Must EXACTLY match the Supabase user AND the `owners` table row (case-insensitive) |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Server-only |
| `RESEND_API_KEY` / `OUTREACH_FROM` | resend.com | `OUTREACH_FROM` must be on a domain you verify in Step B-email below |
| `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` | developer.squareup.com → your app → **Sandbox** tab | Sandbox and production tokens/locations are different values |
| `SQUARE_ENVIRONMENT` | `sandbox` for now | Flip to `production` only at Step 18 |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Created in Step 11 | Leave blank until then |
| `NEXT_PUBLIC_SITE_URL` | Your deployed URL | Must match the webhook notification URL EXACTLY — the HMAC includes it |
| `UNSUBSCRIBE_SECRET` / `CRON_SECRET` | You invent them | `openssl rand -hex 32` twice |
| `BUSINESS_ADDRESS` | Amy's real business mailing address | Legally required in outreach footers (CAN-SPAM) |
| `BUSINESS_LAT` / `BUSINESS_LON` | Google Maps → right-click Amy's area | Powers the weather card; optional |

Email note: in Resend, verify Amy's sending domain (SPF + DKIM records) before Step 15. Until the domain verifies, Resend only delivers to the email address that owns the Resend account — use that address as your test recipient.

### Step 7. Supabase setup
1. supabase.com → New project (choose a region near Florida, e.g. US East).
2. **Edit first, run second:** open `supabase/schema.sql`, change the `insert into owners` line to Amy's real email, then paste the whole file into SQL Editor → Run. Expected: "Success" and seed data inserted.
3. Authentication → Users → **Add user** → Amy's email + a strong password → check "Auto Confirm User".
4. Authentication → Sign In / Providers → Email → **turn OFF "Allow new users to sign up"**. This is important: with signups open, anyone could create an account (they still couldn't pass the `OWNER_EMAIL` check or RLS, but close the door anyway).

### Step 8. Migrations
Fresh v4 database: **skip this step** — `schema.sql` already contains the Square columns and `leads.contact_phone`. Verify:
```sql
select column_name from information_schema.columns
where table_name in ('payments','leads')
  and column_name in ('square_order_id','square_invoice_id','contact_phone');
```
Expected: 3 rows. Only if you're upgrading a database created from v1/v2 do you run `supabase/migrations/002_square.sql` then `003_lead_phone.sql`.

### Step 9. Square sandbox
1. developer.squareup.com → **+ New application** → name it "Sophisticated Sips".
2. Open the app → make sure the **Sandbox** toggle (top of page) is selected.
3. Copy Sandbox Access Token → `SQUARE_ACCESS_TOKEN`.
4. Locations: use the "Default Test Account" location ID → `SQUARE_LOCATION_ID`. (API check: `GET /v2/locations` in their API Explorer shows it.)
5. Restart the dev server after env changes: `npm run dev`, then open the forwarded port 3000 URL Codespaces gives you.

---

## PART C — Functional verification (dev server or preview deploy)

For Steps 10–11 Square needs a **public** URL. Two options: (a) do Steps 10–16 on a Vercel preview deployment (recommended — deploy first with Step 17, then come back), or (b) in Codespaces, set port 3000's visibility to **Public** (Ports tab → right-click → Port Visibility) and use that `https://…app.github.dev` URL as `NEXT_PUBLIC_SITE_URL` temporarily.

### Step 10. Square payment link
1. Sign in at `/owner/login` as Amy.
2. Pipeline tab → any lead → **Confirm** (creates an event with a 25% deposit).
3. Payments tab → **Deposit link ($…)**. Expected: flash message "Square deposit link created and copied".
4. Open the copied link in a new tab → Square-hosted checkout appears.
5. Pay with the sandbox test card: **4111 1111 1111 1111**, any future expiry, any CVV, any ZIP.
6. Expected: redirect back to `/book?paid=1`.
7. Verify the pending row exists: `select kind, status, square_order_id from payments order by created_at desc limit 1;` → `deposit | pending | order-id-present`. (It flips to `paid` via Step 11, or via the **Check payment** button as a manual fallback — test that button now: expected flash "Paid ✦ — records updated.")

### Step 11. Square webhook
1. Square app → **Webhooks** → Subscriptions (make sure you're still in Sandbox) → **Add subscription**.
2. Notification URL: `https://YOUR-PUBLIC-URL/api/square/webhook` — must be char-for-char the same host as `NEXT_PUBLIC_SITE_URL`.
3. Events: check **payment.updated** and **invoice.payment_made** → Save.
4. Copy the **Signature key** → `SQUARE_WEBHOOK_SIGNATURE_KEY` → redeploy/restart.
5. On the subscription page click **Send test event** → payment.updated. Expected: 200 response shown in Square's log. (401 = signature key or URL mismatch — recheck both.)
6. Real-flow test: repeat Step 10 with a fresh deposit link WITHOUT clicking "Check payment". Within ~a minute the Payments tab should show "Deposit paid" on its own. That's the webhook working end-to-end.

### Step 12. Booking form
1. Open `/book` (test on your iPhone too — fields shouldn't zoom on focus, buttons are comfortably tappable).
2. Submit with name, your email, and a date. Expected: gold "Thank you" card.
3. Verify DB: `select name,status from booking_requests order by created_at desc limit 1;` and `select name,source,score from leads order by created_at desc limit 1;` → lead with `source = website`.
4. Check your inbox for the confirmation email (subject "We received your event request").
5. Owner dashboard → Pipeline → the new lead appears with a 📞 Call button if you entered a phone.
6. Negative test: submit with an invalid email → inline error, no DB row.

### Step 13. AI Concierge save_lead tool
1. On any public page, tap the glowing ✦.
2. Have a short planning conversation ("I'm planning a wedding for about 100 people in October").
3. Expected behaviors: it estimates budget as a rough range, recommends Golden Pulse items, asks at most one follow-up per reply, and eventually offers to pass your details to Amy.
4. Give it a test name + your email and say yes, contact me.
5. Expected: warm confirmation that Amy will follow up. Verify: `select name, source, status from leads where source = 'concierge' order by created_at desc limit 1;`
6. Negative test: ask it something off-topic ("write me a poem about cars") → polite decline, stays on catering.
7. Negative test: decline to share contact info → it must NOT save a lead (query again; no new row).

### Step 14. Owner auth
1. Open `/owner` in a private/incognito window → expected: redirect to `/owner/login`.
2. Log in with a WRONG password → friendly error, no access.
3. Log in as Amy → "Good morning/afternoon, Amy ✦" dashboard with weather chip (if lat/lon set).
4. Hard test: create a second Supabase user with a different email (temporarily re-enable signups or add via dashboard), log in as them, visit `/owner` → expected: bounced to login (middleware) — and even via the API, RLS returns them zero rows. Delete the test user after.
5. API test while signed out: `curl -X POST https://YOUR-URL/api/growth-ideas` → `{"error":"owner only"}` 401.

### Step 15. Outreach approval flow
1. Pipeline → a lead whose `contact_email` is YOUR address → **✦ Draft outreach**.
2. Expected: flash "Draft ready in the Approval Queue", auto-switch to the queue, a warm 4–6 sentence draft signed "Amy Lavold — Sophisticated Sips".
3. Click **Decline** on it → status flips to declined, nothing sends. (Check `outreach_logs`: action `declined`.)
4. Draft again → **Approve & send** → expected flash "Email sent ✦".
5. Check your inbox: the email arrives with the footer containing Amy's postal address and an unsubscribe link, and (in raw headers) `List-Unsubscribe`.
6. Verify log: `select action from outreach_logs order by created_at desc limit 2;` → `sent`.

### Step 16. Unsubscribe & suppression
1. Click the unsubscribe link in the email from Step 15. Expected: branded page — "You've been unsubscribed."
2. Verify: `select * from suppression_list;` → your email present.
3. The kill test: go back to Pipeline → **✦ Draft outreach** on the same lead → expected: error "This contact unsubscribed — no new drafts allowed." (blocked at draft time).
4. Belt-and-suspenders: if an older pending draft to that address existed, try approving it → expected: "This contact unsubscribed — the email was not sent." and `outreach_logs` shows `blocked_suppressed`.
5. Tamper test: edit a character in the unsubscribe URL token and open it → "invalid or expired", no DB change.

---

## PART D — Ship it

### Step 17. Deploy to Vercel
1. vercel.com → **Add New → Project** → import the GitHub repo. Framework auto-detects Next.js.
2. Environment Variables: paste every line from `.env.local`. Set `NEXT_PUBLIC_SITE_URL` to the final production domain (e.g. `https://sophisticatedsips.com`).
3. Deploy. Expected: green build.
4. Domains: add Amy's domain, follow the DNS instructions.
5. Cron: `vercel.json` already schedules `/api/cron/followups` daily at 13:00 UTC (~8–9 AM Florida). Vercel automatically sends `Authorization: Bearer $CRON_SECRET` because `CRON_SECRET` is set — verify after the first run: `select count(*) from email_drafts where is_follow_up = true;` (will be 0 until a lead has sat "contacted" for 4+ days — that's correct behavior, not a bug).
6. **Re-point the Square webhook** to the production domain (the sandbox subscription URL you set in Step 11 was the preview URL). Re-run the "Send test event" check.
7. Smoke-test on the production URL: home page animations, `/book` submission, concierge reply, owner login.

### Step 18. Square sandbox → production
Only after every checklist item below passes:
1. Square Developer dashboard → toggle to **Production** → copy the Production access token and the real location ID.
2. In Vercel env vars: update `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, set `SQUARE_ENVIRONMENT=production`.
3. Webhooks: create a **new subscription under Production** (sandbox subscriptions don't carry over) → same URL, same two events → copy the NEW signature key into `SQUARE_WEBHOOK_SIGNATURE_KEY`.
4. Redeploy.
5. Live-fire test with real money: create a $1.00 deposit link on a test event, pay it with a real card, confirm the webhook marks it paid, then refund it from the Square dashboard.
6. Delete test rows: `delete from payments where amount_cents = 100;` and remove the test event/lead.

---

## PART E — Launch checklist (PASS / FAIL)

Print this. Every box must be PASS before Amy shares the link.

| # | Check | How | PASS/FAIL |
|---|---|---|---|
| 1 | `npm install` clean | Step 2 | ☐ |
| 2 | `npm run typecheck` exits 0 | Step 3 | ☐ |
| 3 | `npm run build` succeeds | Step 4 | ☐ |
| 4 | `npm test` → 5/5 passing | Step 5 | ☐ |
| 5 | All 16 env vars set in Vercel, zero secrets with `NEXT_PUBLIC_` prefix | Step 6 | ☐ |
| 6 | Schema ran; owners row = Amy's email; verify query returns 3 columns | Steps 7–8 | ☐ |
| 7 | Supabase public signups DISABLED | Step 7.4 | ☐ |
| 8 | Deposit link → sandbox card → redirect works | Step 10 | ☐ |
| 9 | "Check payment" fallback flips a payment to paid | Step 10.7 | ☐ |
| 10 | Webhook test event returns 200 | Step 11.5 | ☐ |
| 11 | Webhook flips a real sandbox payment to paid WITHOUT manual check | Step 11.6 | ☐ |
| 12 | Booking form → DB row + lead + confirmation email | Step 12 | ☐ |
| 13 | Booking form rejects invalid email | Step 12.6 | ☐ |
| 14 | Concierge saves a consented lead (`source = concierge`) | Step 13 | ☐ |
| 15 | Concierge does NOT save without consent; declines off-topic | Step 13.6–7 | ☐ |
| 16 | `/owner` redirects when signed out; wrong password rejected | Step 14 | ☐ |
| 17 | Non-Amy authenticated user cannot reach dashboard or data | Step 14.4 | ☐ |
| 18 | Owner-only APIs return 401 to the public | Step 14.5 | ☐ |
| 19 | Outreach: decline works, approve sends, footer has postal address + unsubscribe | Step 15 | ☐ |
| 20 | Unsubscribe page works; suppression row created | Step 16.1–2 | ☐ |
| 21 | Suppressed contact blocked at BOTH draft time and send time | Step 16.3–4 | ☐ |
| 22 | Tampered unsubscribe token rejected | Step 16.5 | ☐ |
| 23 | Production deploy green; custom domain resolves with HTTPS | Step 17 | ☐ |
| 24 | Square webhook re-pointed to production domain, test event 200 | Step 17.6 | ☐ |
| 25 | iPhone pass: no input zoom, chat usable, nav scrolls, tap targets comfortable | Step 12.1 | ☐ |
| 26 | $1 production payment succeeds, webhook confirms, refund issued | Step 18.5 | ☐ |
| 27 | Amy's real photos in `/public/gallery` (or empty-state accepted for launch) | — | ☐ |
| 28 | Amy has logged in herself, on her phone, and sent one test invoice | — | ☐ |

## PART F0 — Setup Wizard (after Part B)
Once env vars and the schema exist, `/owner/setup` walks Amy through profile, connection tests (Square/email/AI, one tap each), booking rules (deposit %), admins, and her own launch checklist — do it before Part C so the test buttons validate the wiring early. Fresh installs get the ownership tables from schema.sql; upgrades run `supabase/migrations/005_ownership.sql`.

## PART F — Day-one operations notes for Amy
- Every morning: open `/owner`, tap **✦ Ask AI** for the briefing, clear the Approval Queue.
- Money flow: Confirm lead → Deposit link (it auto-copies — paste into a text) → after deposit, Send balance invoice.
- If a payment looks stuck: **Check payment** button reconciles directly with Square.
- Never email anyone who unsubscribed — the system already refuses; don't work around it from a personal inbox.
- If anything errors: screenshot the flash message + the Vercel → Logs entry for that minute. That's everything needed to fix it.
