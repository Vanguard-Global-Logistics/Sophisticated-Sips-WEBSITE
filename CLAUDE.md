# CLAUDE.md — Sophisticated Sips

Production platform for a real business (Amy Lavold's luxury mobile espresso catering, Florida). Real customers, real money, real email. Bias every decision toward stability and verification over new capability.

## Current state (recovery checkpoint 2026-08-17)
The canonical repository is deployed from `main` to the surviving Vercel project `sophisticated-sips`. Runtime, Supabase, menu, owner-login rendering, and Kai were re-verified against production. Typecheck and lint are clean; 10 unit tests pass. See `RECOVERY_STATUS_2026-08-17.md` for the exact verified state and remaining launch blockers. The public domain is `sophisticatedsips.net`; `.com` is not the production domain.

## Commands
```
npm install
npm run dev          # localhost:3000
npm run typecheck    # tsc --noEmit — must exit 0
npm run lint         # next lint (.eslintrc.json = next/core-web-vitals)
npm run build
npm test             # vitest — expect 10/10
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

## Brand assets and generated media
**Real assets before generated ones, always.** This repo ships real photography of the business; reaching for an image generator when a genuine photo exists produces off-brand work and costs money. Check `public/gallery/` first: `hero-trailer.jpg` (the trailer at dusk, also the homepage hero), `01-latte-art`, `02-trailer-event`, `03-barista-pour`, `04-bottle-display`, `05-espresso-pour`, `signature-drinks`. Kai's likeness is `public/brand/kai-ai-assistant.png`. Generate only to fill a genuine gap, and anchor it to a real photo as reference.

**Never describe the palette from memory — read it from `globals.css`.** The tokens are the source of truth: `--teal:#0F3433`, `--teal-deep:#0A2423`, `--gold:#C9A45C`, `--gold-light:#EBD6A0`, `--cream:#F6EFE3`, `--espresso:#2B1D12`, `--ink:#14100C`, `--caramel:#B0713E`. It is a deep **teal**, not green. Pass the hex values into any generation prompt rather than colour adjectives, which drift.

**Higgsfield (via MCP) is the media pipeline.** Standing assets: the `Sips-Kai` character element (`f09c9e33-5748-4393-b719-083d86acc5b5`) locks his face and apron across scenes; the `Kai-Voice` voice element (`43246dfc-e395-4e68-b875-b6fe0772b25d`) is his cloned voice. Reuse them instead of re-creating — the voice clone alone costs 40 credits.

**Credit discipline.** Every generation spends the owner's money. Preflight with `get_cost:true` before *any* paid call — including voice cloning, which is not free — and quote the real ledger from the `transactions` tool rather than your own arithmetic. Higgsfield has no dedicated lip-sync model; audio-driven talking video comes from a base render plus a `seedance_2_0_mini` repair pass, and that repair returns **picture only**.

**Verify media instead of asserting it.** `sandbox_exec` is a Higgsfield cloud shell with ffmpeg/ffprobe that can reach generated media (the local environment cannot). Use it to confirm streams exist before wiring anything up, and to mux audio onto silent footage with `-c:v copy` — free, and far cheaper than re-rendering.

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
