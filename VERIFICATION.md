# v4.1 Pre-Launch Verification Record

Date: 2026-07-05 · Verifier: automated static battery (this environment has no package registry access, so the four npm commands run in Codespaces — see LAUNCH.md Part A).

## Verified here (static, exhaustive)
- **TypeScript**: `tsc --noEmit` over the full project — zero real errors. All remaining diagnostics are missing-node_modules artifacts (React/Node/Next type packages), enumerated by code: TS7026/TS7006/TS7031/TS2503/TS2741 (React types), TS2591 (Node types), TS2307 (package resolution), TS2353-RequestInit (Next fetch augmentation).
- **Structure**: 54 source files brace/bracket balanced; all 8 pages export defaults; every import path resolves.
- **Content**: zero placeholders, TODOs, lorem, or dev-facing copy on public pages (gallery empty state replaced with branded tiles); 34 brand mentions; Amy Lavold named across 8 files; zero Stripe remnants.
- **Security posture**: no client component references any secret env var; 13 of 15 API routes explicitly gated (owner session, webhook HMAC, cron bearer, or signed token); the 2 public-by-design routes (bookings, concierge) validate + honeypot / consent-gate their writes.
- **Payments completeness**: deposit link, full-payment link (sets both paid flags), balance invoice, manual status check, signed webhook — all server-side.
- **Booking**: client validates presence + email format + future date (with input min); server re-validates independently; lead auto-created; receipt awaited.

## Must run in Codespaces before launch (cannot execute here)
`npm install` → `npm run typecheck` → `npm run build` → `npm test` (expect 5/5), then LAUNCH.md Parts B–E, finishing with the 28-item PASS/FAIL gate.

## Known launch-day realities
- Gallery shows branded tiles until real photos land in /public/gallery.
- Revenue/profit figures start at $0 until the first Square payment — correct, not a bug.
- Resend delivers only to the account owner's address until Amy's domain verifies.
