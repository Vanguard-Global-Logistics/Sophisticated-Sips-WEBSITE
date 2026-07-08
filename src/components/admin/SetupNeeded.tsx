import Link from "next/link";

const VARS: [string, string][] = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase → Settings → API → Project URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase → Settings → API → anon public key"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase → Settings → API → service_role key (server-only)"],
  ["OWNER_EMAIL", "Amy's login email — must match the Supabase Auth user"],
  ["ANTHROPIC_API_KEY", "console.anthropic.com → API Keys (for the AI features)"],
  ["RESEND_API_KEY", "resend.com → API Keys (for email)"],
  ["SQUARE_ACCESS_TOKEN", "developer.squareup.com → your app (Sandbox for staging)"],
  ["SQUARE_LOCATION_ID", "developer.squareup.com → Locations"],
  ["NEXT_PUBLIC_APP_ENV", "\"staging\" for the test site, \"production\" when live"],
];

/** Shown on /owner routes when Supabase env vars are absent — no crash, clear next steps. */
export default function SetupNeeded() {
  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 680 }}>
        <div className="sec-head" style={{ marginBottom: 22 }}>
          <div className="sec-kicker">Setup required</div>
          <h1 className="sec-title serif">Almost there ✦</h1>
          <p className="sec-sub">
            The site is deployed and the public pages are live in demo mode. To switch on the
            owner dashboard, bookings, payments, and AI, add these environment variables in
            Vercel → Settings → Environment Variables, then redeploy.
          </p>
        </div>
        <div className="glass" style={{ padding: 26 }}>
          {VARS.map(([key, where]) => (
            <div key={key} className="lead" style={{ padding: "12px 0", alignItems: "flex-start" }}>
              <code style={{ color: "var(--gold-light)", fontSize: 13.5, wordBreak: "break-all" }}>{key}</code>
              <span style={{ fontSize: 13, opacity: 0.7, textAlign: "right", maxWidth: 300 }}>{where}</span>
            </div>
          ))}
          <p style={{ marginTop: 16, fontSize: 13, opacity: 0.65 }}>
            Full walkthrough with click-by-click steps: see LAUNCH.md Part B in the repo.
            The public site works right now without any of these — they only unlock the owner tools.
          </p>
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link href="/" className="btn btn-ghost">← View the public site</Link>
        </div>
      </div>
    </div>
  );
}
