import { redirect } from "next/navigation";
import { requireOwner, isSupabaseConfigured } from "@/lib/database/supabase-server";
import SetupNeeded from "@/components/admin/SetupNeeded";

export const metadata = { title: "Training & Setup — Sophisticated Sips" };
export const dynamic = "force-dynamic";

const SECTIONS: [string, string][] = [
  ["Logging in", "Go to your website address + /owner/login and use your email and password. If you ever forget the password, it's reset in Supabase (Authentication → Users → your email → Reset). Sign out with the button in the dashboard header when using a shared or public device."],
  ["The dashboard tabs", "Daily Summary is your morning home base — AI briefing, today's schedule, money, and supplies. Pipeline holds every inquiry. Lead Finder turns public event announcements you paste into leads. Approval Queue is where AI-written emails wait for your yes or no. Marketing writes social posts for you. Insights shows your real numbers. Menu Editor changes the public menu instantly. Payments handles deposits and invoices. Growth Ideas suggests seasonal moves."],
  ["How bookings work", "A customer fills out /book (or gives their details to the AI Concierge). That instantly creates a booking record AND a scored lead in your Pipeline, and they get a confirmation email. When you agree on a date, tap Confirm on the lead — that creates the Event with a deposit calculated from your Setup Wizard percentage."],
  ["How Square payments work", "On a confirmed event: Deposit link or Full payment copies a secure Square checkout link — text or email it to your client. After the deposit, Send balance invoice makes Square email a proper invoice. When they pay, Square notifies the site automatically and the event flips to paid. If it ever looks stuck, tap Check payment. Refunds are done inside your Square dashboard."],
  ["How the AI Concierge works", "It's your 24/7 event consultant on the public site. It recommends drinks, estimates budgets as rough ranges, and never promises availability or final prices — those are always yours. If a visitor agrees, it saves their details straight into your Pipeline marked 'concierge'."],
  ["How the AI Secretary works", "Tap ✦ Ask AI each morning for a briefing built only from your real data — new leads, approvals waiting, money, upcoming events, and how many pounds of beans and gallons of milk your booked week needs. It also drafts outreach and follow-up emails, but only ever drafts."],
  ["How outreach approval works", "Every AI email sits in the Approval Queue until you tap Approve & send. Read each one as if you wrote it — it goes out under your name with your business address and an unsubscribe link automatically attached. Follow-ups stop at three, and stop instantly on any decline."],
  ["How unsubscribe & suppression work", "If anyone clicks unsubscribe, they go on a permanent do-not-email list. The system will refuse to draft OR send to them ever again — and it double-checks at both steps. Never work around this from your personal inbox; it's the law and it's your reputation."],
  ["What NOT to touch", "Never share or screenshot anything from Supabase's API settings page — those keys are the master keys to your data. Don't edit the database tables by hand; use the dashboard. Don't change Vercel environment variables unless TRANSFER.md tells you to. And never email someone on the suppression list from anywhere."],
];

export default async function TrainingPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded />;
  if (!(await requireOwner())) redirect("/owner/login");
  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="sec-head" style={{ marginBottom: 24 }}>
          <div className="sec-kicker">Owner training</div>
          <h1 className="sec-title serif">How to run your platform</h1>
          <p className="sec-sub">Ten minutes of reading covers everything. The tap-along daily routine lives in OWNER_TRAINING.md; first-time configuration lives in the Setup Wizard.</p>
          <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <a className="mini-btn" href="/owner">← Dashboard</a>
            <a className="mini-btn gold" href="/owner/setup">⚙ Setup Wizard</a>
          </div>
        </div>
        <div className="grid" style={{ gap: 14 }}>
          {SECTIONS.map(([h, body]) => (
            <div key={h} className="glass">
              <h3>{h}</h3>
              <p style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.75, opacity: .85 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
