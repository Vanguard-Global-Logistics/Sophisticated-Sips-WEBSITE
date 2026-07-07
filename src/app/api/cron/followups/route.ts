import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/database/supabase-server";
import { askClaude } from "@/lib/ai/claude";

export const runtime = "nodejs";
const MAX_FOLLOW_UPS = 3;

/** Daily cron (see vercel.json). DRAFTS follow-ups only — nothing sends without Amy's approval. */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();

  const { data: leads } = await db
    .from("leads")
    .select("id,name,contact_email,event_type,event_date,guest_count,follow_up_count")
    .eq("status", "contacted")
    .lt("follow_up_count", MAX_FOLLOW_UPS)
    .lt("created_at", cutoff)
    .not("contact_email", "is", null)
    .limit(5);

  let drafted = 0;
  for (const lead of leads || []) {
    const email = lead.contact_email!.toLowerCase();

    const { data: suppressed } = await db.from("suppression_list").select("email").eq("email", email).maybeSingle();
    if (suppressed) continue;
    const { data: existing } = await db.from("email_drafts").select("id").eq("lead_id", lead.id).eq("status", "pending").maybeSingle();
    if (existing) continue;

    const body = await askClaude({
      maxTokens: 400,
      system: "You write short, warm, professional follow-up emails for Amy Lavold, owner of Sophisticated Sips, a luxury mobile espresso trailer in Florida. Never pushy. 3–5 sentences. Sign as 'Amy Lavold — Sophisticated Sips'. Plain text only. Do not include an unsubscribe line (added automatically).",
      messages: [{ role: "user", content: `Follow-up #${lead.follow_up_count + 1} to ${lead.name} about their ${lead.event_type} on ${lead.event_date} (${lead.guest_count} guests). We reached out before and haven't heard back.` }],
    }).catch(() => null);
    if (!body) continue;

    await db.from("email_drafts").insert({
      lead_id: lead.id, to_email: email, to_name: lead.name,
      subject: `Following up — espresso catering for your ${lead.event_type}`,
      body, is_follow_up: true, status: "pending",
    });
    drafted++;
  }
  return NextResponse.json({ ok: true, drafted });
}
