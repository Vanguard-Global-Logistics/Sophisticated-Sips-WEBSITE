import { NextResponse } from "next/server";
import { askClaude } from "@/lib/ai/claude";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";

export const runtime = "nodejs";

/** Ethical lead intake: Amy pastes a PUBLIC event announcement (chamber calendar,
 *  school newsletter, venue vendor call, etc). AI extracts a structured lead.
 *  No scraping, no automation — a human found it, a human will approve any outreach. */
export async function POST(req: Request) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  const { text } = await req.json().catch(() => ({}));
  const src = String(text || "").trim().slice(0, 6000);
  if (src.length < 30)
    return NextResponse.json({ error: "Paste the full public announcement text (at least a few sentences)." }, { status: 400 });

  try {
    const raw = await askClaude({
      maxTokens: 500,
      system: `You extract catering leads from public event announcements for Sophisticated Sips, a mobile espresso catering trailer in Florida. Respond ONLY with JSON, no markdown:
{"name": "organization or event name", "event_type": "one of: Corporate event|School event|Church event|Wedding|Private party|Vendor fair|Grand opening|Holiday party|Real estate event|Community festival|Other", "event_date": "YYYY-MM-DD or null", "guest_estimate": number or null, "contact_email": "only if explicitly printed in the text, else null", "summary": "one sentence on why this is a catering opportunity", "confidence": "high|medium|low"}
Never guess emails. Only extract what the text actually says.`,
      messages: [{ role: "user", content: src }],
    });
    const p = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!p.name) throw new Error("no name extracted");

    const guests = Math.max(0, Math.min(100000, parseInt(p.guest_estimate) || 0));
    const db = supabaseAdmin();
    const { data: lead, error } = await db.from("leads").insert({
      name: String(p.name).slice(0, 200),
      contact_email: p.contact_email ? String(p.contact_email).toLowerCase().slice(0, 200) : null,
      event_type: String(p.event_type || "Other").slice(0, 80),
      event_date: /^\d{4}-\d{2}-\d{2}$/.test(p.event_date || "") ? p.event_date : null,
      guest_count: guests || null,
      score: Math.min(90, (p.confidence === "high" ? 65 : p.confidence === "medium" ? 50 : 35) + Math.floor(guests / 5)),
      est_value_cents: guests ? Math.max(30000, guests * 900) : 30000,
      source: "public_listing",
      status: "new",
    }).select("id").single();
    if (error) throw error;

    return NextResponse.json({
      ok: true, leadId: lead.id, extracted: p,
      nextStep: p.contact_email
        ? "Contact email found in the announcement — you can draft outreach from the Pipeline."
        : "No contact email was printed in the text; find one on their public site before outreach.",
    });
  } catch (e) {
    console.error("extract-lead:", e);
    return NextResponse.json({ error: "Couldn't extract a lead from that text — try pasting more of the announcement." }, { status: 422 });
  }
}
