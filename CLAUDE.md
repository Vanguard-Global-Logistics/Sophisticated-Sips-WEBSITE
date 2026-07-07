# CLAUDE.md — Sophisticated Sips

Production platform for a real business (Amy Lavold's luxury mobile espresso catering, Florida). Real customers, real money, real email. Bias every decision toward stability and verification over new capability.

## Current state (v1.2.0)
Built and statically verified across multiple audit passes, but **never executed with dependencies installed** — the build environment that produced this code had no package registry access. Expect `npm run typecheck` to pass clean once node_modules exists (all prior tsc noise was missing-types artifacts); anything that prints is real and should be fixed. 5 unit tests exist (`npm test`) covering the two security-critical HMACs.

## Commands
```
npm install
npm run dev          # localhost:3000
npm run typecheck    # tsc --noEmit — must exit 0
npm run lint         # next lint (.eslintrc.json = next/core-web-vitals)
npm run build
npm test             # vitest — expect 5/5
```

## Architecture map
- `src/app/` — App Router. 10 pages (7 public, /owner + /owner/{login,setup,training,transfer}), 20 API routes under `src/app/api/`.
- `src/components/{public,admin,admin/tabs,ai}/` — client islands; data pages are server components.
- `src/lib/square/` — payment links, invoices, order status, webhook HMAC verify. `src/lib/ai/` — server-side Anthropic (claude.ts) + supply forecast. `src/lib/email/` — Resend + signed unsubscribe tokens. `src/lib/database/` — supabase clients, `ownerEmail()/requireOwner()`, `applyPaidPayment()`, audit log. `src/lib/rate-limit.ts`.
- `supabase/schema.sql` — full schema for fresh installs (13 tables, RLS, seeds, never-zero-owners trigger). `supabase/migrations/00{2,3,4,5}` — upgrades only.
- `src/middleware.ts` — session gate on /owner; authorization is `requireOwner()` (owners table) + RLS, NOT the middleware.
- Docs: README (setup) · ARCHITECTURE (systems) · LAUNCH (18-step deploy + 28-item gate) · STAGING (two-env plan) · OPERATIONS (backups/incidents) · OWNER_TRAINING + TRANSFER (for Amy) · AUDIT/VERIFICATION/RELEASE_REPORT (history).

## Non-negotiable guardrails
1. **The custom CSS design system in `globals.css` IS the brand.** Do not convert to Tailwind, do not "modernize" the palette (deep teal / espresso / cream / champagne gold), do not remove the steam/beans/shimmer animations. `prefers-reduced-motion` support must survive any animation change.
2. **Secrets are server-only.** No secret env var may be read in any `"use client"` file; only `NEXT_PUBLIC_SUPABASE_URL` and the anon key ship to the browser. The owner status API returns booleans about keys, never values.
3. **Outreach compliance is load-bearing, not decorative.** Never weaken: human approval before any send, suppression checked at draft AND send time, ≤3 follow-ups, signed unsubscribe tokens + List-Unsubscribe header, postal address footer. The cron drafts only.
4. **No scraping.** The Lead Finder is deliberately paste-based (human finds public listing → AI structures it). Do not automate collection from external sites.
5. **Staging guards must not be weakened:** `NEXT_PUBLIC_APP_ENV !== "production"` ⇒ banner shown, all outbound email rerouted to OWNER_EMAIL, Square payment/invoice creation blocked if Square env is production, site noindexed.
6. **Auth model:** owners table is the source of truth (`ownerEmail()`), `OWNER_EMAIL` env is break-glass only, RLS `is_owner()` on every table, and the DB trigger guaranteeing ≥1 owner must never be dropped.
7. **AI grounding:** every AI feature is grounded in real DB data and prompt-forbidden from inventing testimonials/stats/availability/prices. The concierge saves leads only with explicit consent via its `save_lead` tool. Keep it that way in any prompt edits.
8. **No new dependencies or features without explicitly asking William first.** The mission is verify → fix → ship.

## Conventions
- TypeScript strict; pragmatic `any` is accepted at supabase-result edges (no generated DB types yet — generating them is a welcome improvement if it stays zero-behavior-change).
- API routes: `NextResponse.json({ error })` with proper status codes; owner routes start with the `ownerEmail()` gate; sensitive actions call `logAdmin()`.
- Money is integer cents everywhere; `usd()` helpers format for display.
- Docs are written in prose (Word-doc style, no bullet spam) when user-facing; Amy-facing docs are plain English, zero jargon.

## Priority work queue (in order)
1. `npm install && npm run typecheck && npm run lint && npm run build && npm test` — fix every real error, smallest possible diffs.
2. `npm run dev` — click through all 10 pages; fix rendering/runtime issues.
3. Stand up staging per STAGING.md (staging Supabase project + schema, sandbox Square, Preview env vars).
4. Execute LAUNCH.md Parts B–C against staging (booking → lead → concierge save_lead → owner auth → outreach/unsubscribe → sandbox payment → webhook).
5. Report against the 28-item Part E checklist; hand to Amy for her wizard checklist.
Known open items (documented, not bugs): refund webhooks not ingested (v1.1 candidate), rate limiting is per-instance best-effort, forecast constants untuned, gallery awaits real photos.
