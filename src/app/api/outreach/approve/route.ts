import { NextResponse } from "next/server";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";
import { sendOutreachEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
const MAX_FOLLOW_UPS = 3;

/** Amy approves or declines a draft. Approval sends the email — after compliance gates. */
export async function POST(req: Request) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  const { draftId, action } = await req.json().catch(() => ({}));
  if (!draftId || !["approve", "decline"].includes(action))
    return NextResponse.json({ error: "draftId and action (approve|decline) required" }, { status: 400 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const { data: draft } = await db.from("email_drafts").select("*").eq("id", draftId).single();
  if (!draft) return NextResponse.json({ error: "draft not found" }, { status: 404 });
  if (draft.status !== "pending")
    return NextResponse.json({ error: `draft already ${draft.status}` }, { status: 409 });

  if (action === "decline") {
    await db.from("email_drafts").update({ status: "declined", decided_at: new Date().toISOString() }).eq("id", draftId);
    await db.from("outreach_logs").insert({ lead_id: draft.lead_id, draft_id: draftId, to_email: draft.to_email, action: "declined", detail: "Owner declined draft" });
    return NextResponse.json({ ok: true, status: "declined" });
  }

  const to = draft.to_email.toLowerCase();

  // Gate 1: suppression list — opt-outs are permanent.
  const { data: suppressed } = await db.from("suppression_list").select("email").eq("email", to).maybeSingle();
  if (suppressed) {
    await db.from("email_drafts").update({ status: "blocked", decided_at: new Date().toISOString() }).eq("id", draftId);
    await db.from("outreach_logs").insert({ lead_id: draft.lead_id, draft_id: draftId, to_email: to, action: "blocked_suppressed", detail: "Recipient previously unsubscribed" });
    return NextResponse.json({ ok: false, status: "blocked", reason: "This contact unsubscribed — the email was not sent." });
  }

  // Gate 2: follow-up cap.
  if (draft.is_follow_up && draft.lead_id) {
    const { data: lead } = await db.from("leads").select("follow_up_count,status").eq("id", draft.lead_id).single();
    if (lead && (lead.follow_up_count >= MAX_FOLLOW_UPS || lead.status === "declined")) {
      await db.from("email_drafts").update({ status: "blocked", decided_at: new Date().toISOString() }).eq("id", draftId);
      await db.from("outreach_logs").insert({ lead_id: draft.lead_id, draft_id: draftId, to_email: to, action: "blocked_max_followups", detail: `Cap of ${MAX_FOLLOW_UPS} reached or lead declined` });
      return NextResponse.json({ ok: false, status: "blocked", reason: "Follow-up limit reached for this lead." });
    }
  }

  await sendOutreachEmail({ to, subject: draft.subject, body: draft.body });

  await db.from("email_drafts").update({ status: "sent", decided_at: new Date().toISOString(), sent_at: new Date().toISOString() }).eq("id", draftId);
  await db.from("outreach_logs").insert({ lead_id: draft.lead_id, draft_id: draftId, to_email: to, action: "sent", detail: draft.is_follow_up ? "Follow-up sent" : "Initial outreach sent" });
  if (draft.lead_id) {
    if (draft.is_follow_up) {
      const { data: lead } = await db.from("leads").select("follow_up_count").eq("id", draft.lead_id).single();
      await db.from("leads").update({ follow_up_count: (lead?.follow_up_count ?? 0) + 1 }).eq("id", draft.lead_id);
    }
    await db.from("leads").update({ status: "contacted" }).eq("id", draft.lead_id).in("status", ["new", "hot"]);
  }
  return NextResponse.json({ ok: true, status: "sent" });
}
