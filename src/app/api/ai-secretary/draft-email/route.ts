import { NextResponse } from "next/server";
import { askClaude } from "@/lib/ai/claude";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";

export const runtime = "nodejs";

/** Owner-only. Drafts an outreach email for a lead → Approval Queue. NEVER sends. */
export async function POST(req: Request) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  const { leadId, angle } = await req.json().catch(() => ({}));
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const { data: lead } = await db.from("leads").select("*").eq("id", leadId).single();
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });
  if (!lead.contact_email)
    return NextResponse.json({ error: "This lead has no email address — add one first." }, { status: 400 });

  // Compliance gates apply at drafting time too — don't queue what can never send.
  const email = lead.contact_email.toLowerCase();
  const { data: suppressed } = await db.from("suppression_list").select("email").eq("email", email).maybeSingle();
  if (suppressed)
    return NextResponse.json({ error: "This contact unsubscribed — no new drafts allowed." }, { status: 409 });
  if (lead.status === "declined")
    return NextResponse.json({ error: "This lead declined — no new drafts allowed." }, { status: 409 });

  try {
    const raw = await askClaude({
      maxTokens: 500,
      system: `You write outreach emails for Amy Lavold, owner of Sophisticated Sips, a family-owned luxury mobile espresso trailer in Florida. Tone: warm, professional, never pushy, 4–6 sentences. Reference only what's provided; never fabricate details about the recipient. Sign as "Amy Lavold — Sophisticated Sips". Do NOT include an unsubscribe line (added automatically at send). Respond ONLY with JSON: {"subject": "...", "body": "..."} — no markdown, no backticks.`,
      messages: [{
        role: "user",
        content: `Lead: ${lead.name}. Event type: ${lead.event_type}. Date: ${lead.event_date}. Guests: ${lead.guest_count}. Source: ${lead.source}.${angle ? ` Angle Amy wants: ${String(angle).slice(0, 300)}` : ""}`,
      }],
    });
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!parsed.subject || !parsed.body) throw new Error("bad AI response shape");

    const { data: draft, error } = await db.from("email_drafts").insert({
      lead_id: leadId, to_email: email, to_name: lead.name,
      subject: String(parsed.subject).slice(0, 300),
      body: String(parsed.body).slice(0, 8000),
      is_follow_up: false, status: "pending",
    }).select("id").single();
    if (error) throw error;

    return NextResponse.json({ ok: true, draftId: draft.id, subject: parsed.subject });
  } catch (e) {
    console.error("draft-email:", e);
    return NextResponse.json({ error: "Couldn't draft the email — try again." }, { status: 502 });
  }
}
