# Hotfix: graceful degradation without backend env vars

## Root cause
`supabaseServer()` and `supabaseAdmin()` called `createClient(process.env.X!, ...)`. The `!`
non-null assertions satisfied the compiler, but at runtime with empty env vars the Supabase SDK
throws on construction. Public pages call these at request time → the error boundary ("That pour
didn't land") rendered. Middleware did the same → MIDDLEWARE_INVOCATION_FAILED (500).

## Fix
- `supabaseServer()` / `supabaseAdmin()` now return `null` when their env vars are missing, plus
  `isSupabaseConfigured()` helper. The `setAll` cookie param is now typed (`CookieOptions`), no `any`.
- Middleware short-circuits to `NextResponse.next()` when unconfigured and wraps `getUser()` in
  try/catch — it can no longer throw.
- Public pages (Home, Catering, Menu) fall back to `src/lib/demo-data.ts` (mirrors the DB seeds)
  when the client is null or returns no rows. Gallery and About never used the DB.
- Owner pages render `<SetupNeeded />` (a clean checklist of required env vars) instead of crashing.
- All 18 API routes guard `supabaseAdmin()`/`supabaseServer()` nulls and return 503 "not configured"
  (unsubscribe returns its branded HTML variant) — no route throws.

## Result
- Public site fully renders with ZERO backend env vars (demo content, working/validating forms).
- /owner shows the setup screen instead of a 500.
- Typecheck: zero real errors. 67 files brace-balanced.

## Still required to leave demo mode
Add the env vars listed on the /owner setup screen (or LAUNCH.md Part B) in Vercel and redeploy.
