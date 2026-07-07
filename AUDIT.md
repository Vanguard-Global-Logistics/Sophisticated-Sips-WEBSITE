# Engineering Audit — Sophisticated Sips (CTO pass)

Every finding below was **fixed in this pass** unless marked "deferred". Grouped by severity.

## 🔴 Bugs that would break in production
| # | Finding | Fix |
|---|---|---|
| 1 | **AI Concierge would 400 on the very first message.** The UI's greeting is an assistant turn, and the Anthropic API requires conversations to start with a user turn. | `/api/ai-concierge` now strips leading assistant messages before calling the model. |
| 2 | **Booking receipt emails could silently never send.** `sendBookingReceipt` was fire-and-forget; serverless platforms kill un-awaited work after the response returns. | Awaited (it already swallows its own errors, so bookings never fail because of email). |
| 3 | **Floating beans lost their size variation.** The inline `transform: scale()` was clobbered by the keyframe animation's `transform`. | Scale moved to a CSS custom property consumed inside the keyframes. |
| 4 | **"Call customer" was impossible** — leads never stored a phone number even though the booking form collects one. | `leads.contact_phone` column (migration `003`), populated on booking, tap-to-call `tel:` button in the pipeline. |

## 🟠 Security & compliance
| # | Finding | Fix |
|---|---|---|
| 5 | Outreach footer lacked a physical postal address (CAN-SPAM requires one). | `BUSINESS_ADDRESS` env var injected into every outreach footer. |
| 6 | Unsubscribe + Square webhook HMACs were untested despite being the two security-critical pure functions. | Unit tests: round-trip, tamper rejection, missing header (`npm test`). |
| 7 | Env audit: confirmed no secret has a `NEXT_PUBLIC_` prefix, no server lib is imported by a client component, dashboard reads go through the anon client + RLS only. | Verified — no change needed. |

## 🟡 Code quality & duplication
| # | Finding | Fix |
|---|---|---|
| 8 | Mark-payment-paid logic duplicated in the webhook and payment-status routes (drift risk). | Extracted to `lib/database/payments.ts` → `applyPaidPayment()`, idempotent. |
| 9 | Supabase browser client recreated on every dashboard render; `useCallback` dep list lied about it. | `useMemo`'d client, honest dependency array. |
| 10 | Dashboard `load()` ignored query errors → blank data with no explanation. | Failures surface in the flash bar. |
| 11 | Dead `referenceId` param in `createPaymentLink`. | Removed. |
| 12 | Leftover "Stripe" copy in the Payments empty state. | Removed. |

## 🔵 Accessibility (target: 95+)
| # | Finding | Fix |
|---|---|---|
| 13 | Form labels weren't associated with controls. | `htmlFor`/`id` on all 14 booking fields; `required` + `aria-required` on the 3 mandatory ones; error region is `role="alert"`. |
| 14 | Menu tabs were plain buttons. | `role="tablist"` / `tab` / `tabpanel` + `aria-selected`. |
| 15 | No skip link; several controls lacked visible focus. | Skip-to-content link; `:focus-visible` rings on fab, chips, tabs, mini buttons. |
| 16 | Chat updates weren't announced. | `aria-live="polite"` on the message body; `aria-expanded` on the fab. |
| 17 | Reduced motion. | Already respected globally — verified. |

## 🟢 Performance & SEO (target: 95+)
| # | Finding | Fix |
|---|---|---|
| 18 | Google Fonts loaded via render-blocking CSS `@import`. | Migrated to `next/font` (self-hosted, `display: swap`, zero layout shift), CSS uses `var(--font-serif/sans)`. |
| 19 | No `metadataBase` (broken absolute OG URLs), no sitemap, no robots. | Added all three + title template + `robots` meta; `/owner` and `/api` disallowed. |
| 20 | No structured data. | `FoodEstablishment` JSON-LD on the home page. |
| 21 | No route-level loading/error UX. | Branded `loading.tsx` (steam-cup loader), `error.tsx`, `not-found.tsx`, and `template.tsx` page-fade transitions. |
| 22 | Weather without another paid API. | Open-Meteo (keyless, free), server-side, 30-min cache, owner-gated, degrades gracefully if coords unset. |

## AI experience upgrades
- Concierge: typewriter reveal, session-persistent conversation memory (survives navigation *and* reload), smarter chips (budget estimator, package comparison, holiday ideas).
- System prompt now encodes: guest-count heuristics, budget math, package comparison rules, event-matched recommendations, timeline norms, a one-upsell-max rule, and one-follow-up-question-per-reply.

## Owner experience upgrades
- "Good morning, Amy ✦" header with date, today's event count, staff estimate (guest-count heuristic), and live weather.
- Quick actions grid: Create invoice · Approve emails (with count) · Send deposit · Ask AI · New product · Growth report.
- Today's schedule with deposit-due flags, unpaid-balances stat, 30-day profit estimate (clearly labeled as a ~45%-cost heuristic).

## Honest limitations
- **This sandbox has no network**, so `npm run build / lint / typecheck / test` could not be executed here. The code was hand-audited (imports, brace balance, API shapes) but run the four commands in Codespaces before deploying — that's the real Phase 6.
- Inventory tracking and staff scheduling need their own tables to be real; the dashboard shows honest *derived estimates* instead of fake data. Say the word and I'll add `inventory_items` + `staff_assignments` properly.
- Lighthouse scores can only be measured on a deployed build.
