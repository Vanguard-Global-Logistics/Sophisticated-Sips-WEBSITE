import { NextResponse } from "next/server";
import { askClaude } from "@/lib/ai/claude";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";

export const runtime = "nodejs";

const CHANNELS = ["instagram", "facebook", "tiktok", "google_business", "email_newsletter", "campaign"] as const;

/** AI Marketing Director: channel-specific drafts grounded in the real menu and lead mix. */
export async function POST(req: Request) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  const { channel = "instagram", theme = "" } = await req.json().catch(() => ({}));
  if (!CHANNELS.includes(channel))
    return NextResponse.json({ error: `channel must be one of: ${CHANNELS.join(", ")}` }, { status: 400 });

  const db = supabaseAdmin();
  const [{ data: menu }, { data: leads }] = await Promise.all([
    db.from("menu_items").select("name,category,price_label").eq("active", true),
    db.from("leads").select("event_type").order("created_at", { ascending: false }).limit(40),
  ]);
  const topTypes = Object.entries((leads || []).reduce((m: any, l: any) => ((m[l.event_type] = (m[l.event_type] || 0) + 1), m), {}))
    .sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([t]) => t).join(", ") || "corporate, weddings, schools";
  const month = new Date().toLocaleString("en-US", { month: "long" });

  try {
    const reply = await askClaude({
      maxTokens: 1000,
      system: `You are the AI Marketing Director for Sophisticated Sips, a family-owned luxury mobile espresso trailer in Florida (owner: Amy Lavold). Voice: warm, premium, local, never corporate-stiff. Never invent events, testimonials, statistics, or customer names. Only reference real menu items provided. Include a clear call to action ("Book your event" → link in bio / sophisticatedsips.com). Plain text output.`,
      messages: [{
        role: "user",
        content: `Channel: ${channel}. Month: ${month}. Demand lately: ${topTypes}.${theme ? ` Theme Amy wants: ${String(theme).slice(0, 200)}.` : ""}
Real menu: ${(menu || []).map((m: any) => `${m.name} (${m.price_label})`).join(", ")}.

Write 3 ready-to-post drafts for this channel. For each: a hook line, the post body (channel-appropriate length), and 4–6 hashtags where the channel uses them. Number them 1–3, plain text.`,
      }],
    });
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("marketing:", e);
    return NextResponse.json({ error: "AI unavailable" }, { status: 502 });
  }
}
