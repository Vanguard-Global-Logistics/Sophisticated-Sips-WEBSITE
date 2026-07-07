# Sophisticated Sips — System Architecture

One Next.js app, one database, five AI capabilities, one payment platform. Amy is the only human in the loop, and she's in the loop everywhere it matters.

## The five AI systems (all server-side, key never leaves the server)

| System | Route | Grounding | Human in the loop |
|---|---|---|---|
| **Concierge** (public) | `POST /api/ai-concierge` | Menu, packages, estimator heuristics in prompt | Saves a lead via the `save_lead` tool ONLY when the visitor shares contact info and agrees; low confidence → "Amy will personally confirm" |
| **Secretary: daily briefing** | `POST /api/ai-secretary/daily-summary` | Live DB: new leads, approvals, next events, 7-day revenue, repeat customers, supply forecast | Read-only; Amy acts |
| **Secretary: outreach drafter** | `POST /api/ai-secretary/draft-email` + daily cron | Lead record | Draft only; suppression checked at draft time; Amy approves every send |
| **Sales: lead extractor** | `POST /api/ai-secretary/extract-lead` | Public announcement text Amy pastes | Amy finds the listing, Amy approves outreach — no scraping by design |
| **Marketing Director** | `POST /api/ai-marketing` | Real menu + recent lead mix + season | Drafts only; Amy posts manually |

## Money (Square)
`lib/square/client.ts` → payment links (Quick Pay), invoices (customer → order → publish), order status.
Webhook (`payment.updated`, `invoice.payment_made`) verified with HMAC-SHA256 over notification-URL + raw body.
`applyPaidPayment()` is the single idempotent paid-marker used by both webhook and manual status check.
Flow: confirm lead → event (25% deposit) → deposit link → balance invoice → paid flags → BI.

## Data & security
- 9 tables + `owners` allow-list; RLS `is_owner()` on everything; public may only read menu/packages.
- Server routes use the service-role key with validation; the browser only ever holds the anon key.
- Owner auth: Supabase session + middleware email check + RLS (three layers).
- Outreach compliance: signed unsubscribe tokens, `List-Unsubscribe` header, permanent suppression, ≤3 follow-ups, postal address in footer.

## Derived intelligence (no fake data, ever)
- **Supply forecast** (`lib/ai/forecast.ts`): beans/milk/ice/cups from booked guests × consumption constants — labeled as tunable estimates.
- **Insights tab**: revenue series, conversion, avg booking, lead sources, event types, repeat customers — all computed from real rows.
- **Deliberately absent**: customer birthdays (no birthday data is collected), automated calendar scraping (compliance posture), inventory counts (needs a real inventory table — next milestone if wanted).

## Voice
`components/admin/VoiceCommand.tsx` — on-device Web Speech API, regex intent router (navigation, revenue answers, seasonal-menu generation via the Marketing Director). Typed fallback for unsupported browsers.

## Frontend
App Router, server components for data pages, `next/font`, scroll reveals (IntersectionObserver, reduced-motion-safe), page-fade `template.tsx`, branded loading/error/404, safe-area + dvh iPhone handling. Custom CSS design system (deep teal / espresso / cream / champagne gold) — intentionally not Tailwind; it IS the brand.

## Ownership layer
Authorization source of truth is the `owners` table (RLS `is_owner()` + server `ownerEmail()`); the `OWNER_EMAIL` env var is a break-glass bootstrap owner, rotated at transfer. `business_settings` (single row) drives wizard state and the deposit percentage used when confirming leads. Ownership transfer is a three-step audited workflow (invite → new-owner confirm → outgoing-owner complete) with a database trigger making zero-owner states impossible. All sensitive admin actions append to `admin_audit_log`. In-app surfaces: `/owner/setup` (8-step wizard with secrets-safe status + connection tests), `/owner/training`, `/owner/transfer` (invitee landing).
