# STAGING.md — Test It Before the World Sees It

Plain English, for Amy (with William doing the one-time technical setup). The idea: **two copies of the site**. The *staging* copy is your private playground — fake payments, emails that only come to you, a big striped warning banner. The *live* copy is for real customers. Nothing reaches the live copy until you've approved it on staging.

The safety isn't just a promise — it's built into the code: when a site runs in staging mode it **refuses to create real Square charges**, **reroutes every outgoing email to the owner's inbox**, **shows the STAGING banner on every page**, and **tells Google not to index it**.

---

## The setup (one time, ~45 minutes — William's part)

### 1. Put the code on GitHub (private)
1. github.com → New repository → name it `sophisticated-sips` → select **Private** → Create.
2. Upload the project files (Add file → Upload files works from a phone; or push from Codespaces).
3. Create a second branch called `staging`: on the repo page, branch dropdown → type "staging" → "Create branch: staging from main". From now on: **changes go to `staging` first; `main` is only updated when Amy approves.**

### 2. Connect GitHub to Vercel
1. vercel.com → Add New → Project → Import the repo. Vercel auto-detects Next.js.
2. This gives you two kinds of deployments automatically: the `main` branch becomes the **Production** site; every other branch (like `staging`) becomes a **Preview** site with its own private link.

### 3. Keep staging and production settings separate
Vercel does this natively — every environment variable has checkboxes for **Production** and **Preview**. Set each variable twice with different values:

| Variable | Preview (= staging) | Production (= live) |
|---|---|---|
| `NEXT_PUBLIC_APP_ENV` | `staging` | `production` |
| `SQUARE_ENVIRONMENT` | `sandbox` | `production` |
| `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` / `SQUARE_WEBHOOK_SIGNATURE_KEY` | sandbox values | production values |
| `NEXT_PUBLIC_SUPABASE_URL` / anon key / `SUPABASE_SERVICE_ROLE_KEY` | **staging Supabase project** | **production Supabase project** |
| `NEXT_PUBLIC_SITE_URL` | the preview URL | `https://sophisticatedsips.com` |
| Everything else (AI key, Resend, secrets, address) | same values are fine | same values |

### 4. Two Supabase databases
Create **two** Supabase projects: `sips-staging` and `sips-production`. Run the same `supabase/schema.sql` in both (edit the owner email line first, both times), create Amy's login user in both, disable public signups in both. Staging gets junk data you can play with freely; production stays clean until launch.

### 5. Square: sandbox for staging, production for live
Your Square developer app already has both modes. Sandbox token/location → Preview variables. Production token/location → Production variables. Two webhook subscriptions: a sandbox one pointing at the staging URL, a production one pointing at the live domain. **The code enforces this**: a staging site pointed at production Square blocks payment creation with an error.

### 6. Email in staging = safe by design
No special Resend mode needed — the staging site **reroutes every email to `OWNER_EMAIL`** with a subject like "[STAGING — would have gone to client@example.com] …". So Amy can approve outreach drafts, trigger bookings, click unsubscribe links — and only her own inbox ever receives anything.

### 7. Make the preview private
Vercel → Project → Settings → **Deployment Protection** → turn on Vercel Authentication for Preview deployments. Now the staging link only opens for people you've invited to the Vercel project. (Belt and suspenders: even if someone found it, the banner, sandbox Square, and email rerouting mean they couldn't spend money or spam anyone.)

---

## Amy's part — playing with the staging site

**Getting your private preview link:** William shares it (it looks like `sophisticated-sips-git-staging-….vercel.app`), or you find it in Vercel → Deployments → the latest `staging` deployment → Visit. You'll know you're in the right place: **a gold-striped "STAGING MODE" banner sits at the top of every page.** If you ever don't see that banner, you're on the live site — stop testing.

**Test everything, fearlessly:**
1. **Booking form** — fill out /book with any made-up event (use your real email so you get the confirmation). Check it appears in your dashboard Pipeline.
2. **Owner login** — yoursite-preview/owner/login with your staging password. Poke every tab. Run the ✦ AI briefing. Try the voice button.
3. **AI Concierge** — chat with it on the public pages. Try to trick it into promising a date or a discount (it shouldn't). Give it your details and watch the lead appear in the Pipeline marked "concierge".
4. **Square sandbox payment** — Confirm a lead → Payments tab → Deposit link → open it → pay with the fake card **4111 1111 1111 1111** (any future date, any CVV, any ZIP). No real money exists in the sandbox. Watch the event flip to "Deposit paid".
5. **Outreach + unsubscribe** — Draft outreach on a lead, approve it, and the email arrives in *your* inbox with the [STAGING] tag. Click its unsubscribe link, then try drafting to that lead again — the system should refuse.
6. **Your phone** — do all of the above on your iPhone too, since that's where you'll actually run the business.

**Approving the site:** when everything above feels right, work through the Setup Wizard's launch checklist (`/owner/setup`, step 8) until it says **READY TO LAUNCH**, then tell William "approved."

---

## Going live (after Amy's approval)

1. **Promote the code:** GitHub → Pull requests → New → base `main` ← compare `staging` → Merge. Vercel automatically builds the Production site from `main` with the Production variables (real Square, production database, no banner).
2. **Connect the real domain:** Vercel → Project → Settings → Domains → add `sophisticatedsips.com` → follow the DNS instructions at your registrar. SSL is automatic. Set the Production `NEXT_PUBLIC_SITE_URL` to the domain and redeploy.
3. **Point the production Square webhook** at `https://sophisticatedsips.com/api/square/webhook` and confirm a test event returns 200.
4. **Fresh production database** — the staging junk data stays in staging; production starts clean (menu and packages are seeded by the schema).
5. **Run the final gate:** LAUNCH.md Part E (28 items), ending with the $1 real-card payment + refund and Amy sending one real invoice from her phone.
6. From then on, the rhythm is: build on `staging` → Amy plays → merge to `main`. The live site never sees untested code.

## Go-live checklist (the short version)
☐ Amy approved staging end-to-end (banner visible the whole time)
☐ Wizard shows READY TO LAUNCH on staging
☐ `main` updated by merge, Production deploy green
☐ Production env vars: `NEXT_PUBLIC_APP_ENV=production`, Square = production, production Supabase — and the wizard shows **no environment warning**
☐ No staging banner on the live domain; staging preview still shows it
☐ Domain + HTTPS live; production webhook test = 200
☐ LAUNCH.md Part E all 28 PASS
☐ $1 live payment → webhook paid → refunded

## If something breaks after going live (rollback, 60 seconds)
Vercel → Deployments → find the last deployment that worked → **⋯ → Promote to Production**. The site instantly reverts while you fix things on staging. Database note: rollback reverts *code*, not *data* — data problems are handled per OPERATIONS.md (backups/PITR). If payments misbehave specifically, the dashboard's **Check payment** button keeps money reconciled while you sort it out.
