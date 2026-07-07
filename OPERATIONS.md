# Operations Runbook — Sophisticated Sips

## Backups
**Database (the only irreplaceable data):**
- Supabase Pro plan: enable Point-in-Time Recovery (Settings → Database → Backups) — 7-day rewind, zero effort. Recommended before real customers.
- Free plan interim: daily automated backups exist but restore is limited; add a weekly manual export:
  `Settings → Database → Connection string`, then locally: `pg_dump "$CONN" --no-owner -f sips-backup-$(date +%F).sql` — store in a private location.
- **What does NOT need backup:** Square is the system of record for money (payments/invoices live there); Resend keeps 3 days of email logs; code lives in GitHub; photos in `/public/gallery` live in the repo.

## Monitoring & alerts
- Uptime: point any free monitor (UptimeRobot, Better Stack) at `https://DOMAIN/api/health` every 5 min; alert on non-200. The endpoint reports app + DB reachability and latency.
- Errors: Vercel → Project → Logs shows every API error with the console.error context each route already emits. For proactive alerts, add Sentry later (`@sentry/nextjs`) — deliberately not bundled at launch to keep the surface small.
- Payments sanity: if a payment ever looks stuck, the dashboard's **Check payment** button reconciles directly against Square.

## Analytics
- Zero-config option: Vercel Analytics toggle (privacy-friendly, no cookie banner needed).
- Square dashboard remains the truth for revenue reporting/taxes.

## Incident quick cards
- **Site down:** check /api/health → if `db: unreachable`, check Supabase status page + project not paused (free tier pauses after inactivity — Pro removes this).
- **Payments not marking paid:** Square Developer → Webhooks → check delivery log; 401s mean the signature key or `NEXT_PUBLIC_SITE_URL` changed. Interim: use Check payment per event.
- **Outreach emails bouncing:** Resend → Logs; usually DNS records drifted. Suppression list is never affected by outages — it's enforced in our DB.
- **Rolled a bad deploy:** Vercel → Deployments → previous build → Promote to Production (instant rollback).

## Scheduled jobs
- `/api/cron/followups` daily 13:00 UTC (vercel.json), bearer-authed with `CRON_SECRET`. It only DRAFTS; if it ever misbehaves, worst case is extra drafts in the approval queue — nothing sends itself.

## Ownership & audit
- Every settings change, connection test, and transfer step is in `admin_audit_log` (dashboard-readable via SQL editor: `select * from admin_audit_log order by created_at desc limit 50;`).
- Transferring or selling: TRANSFER.md. Adding a backup admin: Setup Wizard step 7, skip the "complete" step.
- The `owners` table can never reach zero rows (database trigger) — the recovery paths are documented in TRANSFER.md → Emergency rollback.
