import { NextResponse } from "next/server";
import { askClaude } from "@/lib/ai/claude";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";

export const runtime = "nodejs";

export async function POST() {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  // Ground the ideas in real pipeline data.
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const { data: leads } = await db
    .from("leads")
    .select("event_type,guest_count,status")
    .order("created_at", { ascending: false })
    .limit(25);

  const month = new Date().toLocaleString("en-US", { month: "long" });
  const mix = (leads || []).map((l: any) => `${l.event_type} (${l.guest_count} guests, ${l.status})`).join("; ") || "no leads yet";

  try {
    const reply = await askClaude({
      maxTokens: 900,
      system: "You are the growth advisor for Sophisticated Sips, a luxury mobile espresso trailer in Florida (espresso bar, crepes, desserts; signature Golden Pulse line; corporate, school, church, wedding, and holiday events).",
      messages: [{
        role: "user",
        content: `Month: ${month}. Recent lead mix: ${mix}. Give 5 short, specific growth ideas for this month — seasonal drinks, menu angles, or catering outreach targets. Plain text, one line each, no markdown.`,
      }],
    });
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("growth:", e);
    return NextResponse.json({ error: "AI unavailable" }, { status: 502 });
  }
}
