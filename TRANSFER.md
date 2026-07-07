# Ownership Transfer Guide — Sophisticated Sips
Two layers: the **in-app transfer** (dashboard access) and the **account transfer** (the services the site runs on). A business sale needs both.

## Layer 1 — In-app (10 minutes)
1. Current owner: /owner/setup → step 7 "Admins" → enter buyer's email → **Invite new owner** (they get a login-invitation email; the action is audit-logged).
2. Buyer: accepts invite, sets password, signs in → lands on /owner/transfer → **Confirm transfer** (they now have owner access; audit-logged).
3. Current owner: same panel → **Complete transfer** → types the buyer's email to confirm → own access removed. A database trigger makes it impossible to ever reach zero owners, and every step is written to `admin_audit_log`.
4. Backup-admin variant: do steps 1–2 and simply never do step 3 — both accounts stay owners.

## Layer 2 — Accounts & infrastructure (do in this order)
1. **GitHub**: repo → Settings → General → Transfer ownership → buyer's account/org. (Vercel keeps deploying if the buyer re-links in step 2.)
2. **Vercel**: Project → Settings → Transfer to the buyer's Vercel team; or buyer imports the transferred repo fresh and pastes env vars. Verify a deploy succeeds before DNS moves.
3. **Supabase**: Organization → Settings → invite buyer as Owner → buyer accepts → remove seller. The database, auth users, and all data move with the org — nothing is exported/imported.
4. **Square**: money accounts are identity-bound and generally NOT transferable — the buyer creates their own Square account + application, and you swap `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY` (new webhook subscription on their account). Historical payments remain visible in the seller's Square for their records.
5. **Resend + email domain**: buyer creates a Resend account, verifies the domain (it moves with DNS in step 6), new `RESEND_API_KEY`; update `OUTREACH_FROM` if the sender address changes.
6. **Domain/DNS**: registrar → transfer domain to buyer (or change account ownership). Keep DNS records identical; TTL low during the move.
7. **Anthropic**: buyer creates their own API key; swap `ANTHROPIC_API_KEY`.

## Rotate EVERYTHING (non-negotiable after a sale)
In Vercel env vars, replace: `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → regenerate), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (regenerate), `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, all three Square values, and generate fresh `UNSUBSCRIBE_SECRET` + `CRON_SECRET` (`openssl rand -hex 32`). **Change `OWNER_EMAIL` to the buyer** — it's a break-glass owner account, so leaving the seller's address there would leave them a back door. Buyer should also change their Supabase password and remove any seller auth users (Authentication → Users).

## Verify the new owner has everything (15-minute test)
Buyer, alone, should be able to: log in at /owner · run the AI briefing · submit a test booking on /book and see the lead · create a deposit link and see the Square checkout · send themselves a test email from the Setup Wizard · see `admin_audit_log` entries for the transfer. If all six work, the handover is real.

## Emergency rollback (transfer went wrong mid-way)
- In-app: any current owner can **Cancel transfer**; if the seller was already demoted, the buyer (now owner) re-invites the seller via the same panel. The env `OWNER_EMAIL` account can always get in — that's what break-glass means.
- Locked out entirely: whoever controls Supabase can re-add any email to the `owners` table (SQL editor: `insert into owners values ('email');`) and reset that user's password. Whoever controls Vercel can set `OWNER_EMAIL` to themselves. Control of Supabase + Vercel IS control of the system — protect those two accounts above all.
