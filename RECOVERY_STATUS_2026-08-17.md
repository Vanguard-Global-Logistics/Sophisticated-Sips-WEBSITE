# Sophisticated Sips recovery checkpoint — 2026-08-17

This is the current source of truth for recovery work. Preserve the working owner-managed catalog and continue from this checkpoint; do not rebuild the site and do not reconnect any deleted duplicate project.

## Canonical stack

- GitHub: `Vanguard-Global-Logistics/Sophisticated-Sips-WEBSITE`
- Branch: `main`
- Last deployed commit at the start of recovery: `4bd1c682b39b297ba398491ade659111950364ef`
- Vercel project: `sophisticated-sips` (`prj_q5106r5GVCGs0dWDUIZFsQzPaACi`)
- Supabase project: `wzzfyvxvsymkenewpbzs`
- Production domain: `https://www.sophisticatedsips.net` (root domain redirects to `www`)
- Vercel fallback URL: `https://sophisticated-sips.vercel.app`

## Verified working

- The Vercel deployment is `READY` and deploys `main` from the canonical repository.
- GoDaddy DNS now routes both `sophisticatedsips.net` and `www.sophisticatedsips.net` to the surviving Vercel project; HTTPS is working.
- Production `NEXT_PUBLIC_SITE_URL` is `https://www.sophisticatedsips.net`.
- All public pages, the printable menu, owner login, and `/api/health` return HTTP 200.
- `/api/health` reports `status: ok` and `db: ok`.
- Supabase contains one confirmed auth user and the matching owner row for `sophisticatedsnacksfl@gmail.com`.
- Amy's owner-managed catalog is intact: 17 active menu items, the corrected 16/24 oz iced sizes, and three catering packages.
- The audit log proves the menu editor was used successfully (10 menu updates and one deletion on 2026-07-27).
- Kai answers live through Anthropic and correctly refuses to claim calendar availability.
- TypeScript and ESLint pass with zero errors or warnings.
- Vitest was upgraded from 2.x (hung on Node 24 after completing tests) to 4.1.10; all 10 tests now finish and pass.

## Production repairs applied

- Created the missing `public.public_appearances` table through a recorded Supabase migration.
- Enabled RLS and installed public-read plus owner-write policies.
- Removed Supabase's legacy broad auto-grants from that table. Anonymous access is SELECT-only; authenticated owner and service-role access is limited to SELECT/INSERT/UPDATE/DELETE.
- Verified a post-migration Kai request produced no new `PGRST205` error.

## Verified source corrections awaiting publication

- Corrected repository guidance and generated marketing copy to use `sophisticatedsips.net`, not the parked `.com` domain.
- Corrected the Kai environment-variable name in documentation, the sample environment, and owner-facing setup messages to `ANTHROPIC_API_KEY_KAI_final`.
- Upgraded Vitest so the verified 10-test suite terminates correctly on Node 24.
- Replaced the AI trailer hero with Amy's genuine 4:3 trailer photograph, placed Kai behind the real service counter, removed the oversized public Kai stage, removed the full-screen intro takeover, and made the concierge user-initiated.
- Re-ran TypeScript, ESLint, Vitest, and `git diff --check`; all pass.
- These repository changes are present in the recovery workspace but are not in the deployed commit yet. The authenticated GitHub publisher required by the repository workflow is unavailable in this workspace, so they must be published before Vercel can deploy them.

## Do not overwrite

- Do not run the old flyer/catalog seed against production. The live rows were edited by Amy and are the source of truth.
- Do not replace the 16 oz / 24 oz iced prices with the superseded 20 oz values.
- Do not recreate or reconnect deleted duplicate Vercel projects.
- `hero-trailer.jpg` is now Amy's genuine supplied trailer photograph. Preserve it as the landing hero.
- `02-trailer-event.jpg` remains an AI placeholder; do not claim it is real photography.

## Remaining launch blockers, in order

1. Publish the verified recovery source changes—including the genuine trailer/Kai hero—to the canonical GitHub `main` branch, let Vercel deploy them, then check desktop and iPhone layouts on the custom domain.
2. Replace `02-trailer-event.jpg` only when Amy supplies another genuine event photograph.
3. Have Amy sign in once and verify the owner dashboard, Menu Editor GET/save, and the new Where You'll Be editor with her existing password.
4. Complete Owner Setup business fields. Production currently has no phone, mailing address, domain, quote rules, or cancellation policy saved.
5. Verify Resend and the sending-domain SPF/DKIM, then test booking receipt, approved outreach, unsubscribe, and suppression. Production currently has no booking/lead/outreach rows, so these flows are not yet proven live.
6. Verify Square sandbox end-to-end (payment link, webhook, manual reconciliation). Only then switch to production and complete the documented $1 charge/refund gate. Production currently has no event or payment rows.
7. Verify public Supabase sign-up is disabled and enable leaked-password protection.
8. Create a protected staging branch/deployment with separate staging Supabase and Square sandbox configuration before further feature development.
9. Address the remaining pre-existing Supabase security-advisor warnings by moving/restricting security-definer helper functions without weakening owner RLS or the never-zero-owner trigger.
10. Enable database backup/PITR and an uptime monitor for `https://www.sophisticatedsips.net/api/health` before announcing launch.

## Current release assessment

The application, custom domain, live menu database, owner account, Kai, and genuine landing-hero photograph are recovered. The verified hero/source changes still need publication, and the product is not yet launch-certified because owner/business setup is incomplete and the booking/email/payment customer journeys have no production verification records.
