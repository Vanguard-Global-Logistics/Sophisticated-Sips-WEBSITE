import { NextResponse } from "next/server";
import { askClaude } from "@/lib/ai/claude";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";
import { forecastSupplies } from "@/lib/ai/forecast";

export const runtime = "nodejs";

/** Owner-only. Builds Amy's daily briefing from real pipeline, drafts, events, and revenue. */
export async function POST() {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const dayAgo = new Date(Date.now() - 864e5).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const [{ data: newLeads }, { data: pipeline }, { data: pendingDrafts }, { data: upcoming }, { data: paid }, { data: allLeads }] =
    await Promise.all([
      db.from("leads").select("name,event_type,event_date,guest_count,est_value_cents").gte("created_at", dayAgo),
      db.from("leads").select("status,est_value_cents").not("status", "in", '("declined")'),
      db.from("email_drafts").select("to_name,subject,is_follow_up").eq("status", "pending"),
      db.from("events").select("title,event_date,deposit_paid").eq("status", "scheduled")
        .gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date").limit(5),
      db.from("payments").select("amount_cents,paid_at").eq("status", "paid").gte("paid_at", weekAgo),
      db.from("leads").select("contact_email,name").not("contact_email", "is", null).limit(500),
    ]);

  const emailCounts: Record<string, { n: number; name: string }> = {};
  for (const l of allLeads || []) {
    const e = l.contact_email!.toLowerCase();
    emailCounts[e] = { n: (emailCounts[e]?.n || 0) + 1, name: l.name };
  }
  const repeatCustomers = Object.values(emailCounts).filter((v) => v.n >= 2).map((v) => `${v.name} (${v.n} events)`).slice(0, 5);
  const supplies = forecastSupplies((upcoming || []) as any);

  const facts = {
    newLeadsLast24h: (newLeads || []).map((l: any) => `${l.name} — ${l.event_type}, ${l.event_date}, ${l.guest_count} guests, ~$${Math.round((l.est_value_cents || 0) / 100)}`),
    pipelineTotal: `$${Math.round((pipeline || []).reduce((s: number, l: any) => s + (l.est_value_cents || 0), 0) / 100)}`,
    pendingApprovals: (pendingDrafts || []).map((d: any) => `${d.to_name || "?"} — "${d.subject}"${d.is_follow_up ? " (follow-up)" : ""}`),
    next5Events: (upcoming || []).map((e: any) => `${e.event_date}: ${e.title}${e.deposit_paid ? "" : " — DEPOSIT UNPAID"}`),
    revenueLast7Days: `$${Math.round((paid || []).reduce((s: number, p: any) => s + p.amount_cents, 0) / 100)}`,
    repeatCustomersWorthAThankYou: repeatCustomers,
    supplyForecastNext7Days: supplies.eventCount === 0 ? "no events booked" :
      `${supplies.eventCount} events, ~${supplies.guests} guests -> ~${supplies.drinks} drinks: ${supplies.beansLb} lb beans, ${supplies.milkGal} gal milk, ${supplies.iceLb} lb ice, ${supplies.cups} cups`,
  };

  try {
    const reply = await askClaude({
      maxTokens: 800,
      system: "You are Amy Lavold's AI Catering Secretary at Sophisticated Sips, a luxury mobile espresso trailer in Florida. Write her a warm, skimmable morning briefing in plain text (no markdown): 1) what's new, 2) what needs her decision today, 3) money + supplies snapshot, 4) one suggested priority. Be specific, use the data given, never invent numbers. Under 180 words.",
      messages: [{ role: "user", content: `Today's data:\n${JSON.stringify(facts, null, 2)}` }],
    });
    return NextResponse.json({ reply, facts });
  } catch (e) {
    console.error("daily-summary:", e);
    return NextResponse.json({ error: "AI unavailable" }, { status: 502 });
  }
}
