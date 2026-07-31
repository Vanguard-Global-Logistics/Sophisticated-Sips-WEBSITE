import { NextResponse } from "next/server";
import { askClaude } from "@/lib/ai/claude";
import { normalizeLegacyMenuRows } from "@/lib/catalog-guard";
import { ownerEmail, supabaseAdmin } from "@/lib/database/supabase-server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are Kai, Amy Lavold's private AI business copilot for Sophisticated Sips.
You help Amy run a luxury mobile espresso, crepe, and dessert catering company in Florida.

Use only the supplied business snapshot. Never invent bookings, revenue, availability, customer details, prices, or payment status.
Give Amy a direct, practical answer in plain language. Lead with what needs attention and recommend the next best action.
You may analyze, prioritize, draft ideas, explain dashboard data, and propose changes.
You cannot claim that an email was sent, a price was changed, a payment was requested, or a booking was confirmed.
Those actions require Amy's explicit approval through the dashboard controls.
Protect customer information. Do not repeat email addresses or phone numbers unless Amy explicitly asks for the individual record.
Keep replies concise: usually 3–7 short paragraphs or a compact list.`;

export async function POST(req: Request) {
  const owner = await ownerEmail();
  if (!owner) return NextResponse.json({ error: "Owner access required." }, { status: 401 });
  if (!rateLimit(clientKey(req, `owner-kai:${owner}`), 30, 5 * 60_000))
    return NextResponse.json({ error: "Kai is receiving too many requests. Please wait a moment." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const messages: ChatMessage[] = Array.isArray(body.messages)
    ? body.messages
        .slice(-12)
        .filter((message: any) =>
          (message?.role === "user" || message?.role === "assistant") &&
          typeof message?.content === "string")
        .map((message: any) => ({ role: message.role, content: message.content.slice(0, 2000) }))
    : [];

  if (!messages.length || messages[messages.length - 1].role !== "user")
    return NextResponse.json({ error: "A question is required." }, { status: 400 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Business data is not configured for this deployment." }, { status: 503 });

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [settings, leads, events, payments, drafts, menu] = await Promise.all([
    db.from("business_settings").select("business_name,owner_name,service_area,deposit_percent,quote_rules").eq("id", 1).maybeSingle(),
    db.from("leads").select("status,event_type,event_date,guest_count,score,est_value_cents,created_at,booking_requests(notes)").order("created_at", { ascending: false }).limit(75),
    db.from("events").select("title,event_date,guest_count,quote_total_cents,deposit_paid,balance_paid,status").gte("event_date", monthStart).order("event_date").limit(75),
    db.from("payments").select("kind,amount_cents,status,paid_at,created_at").gte("created_at", `${monthStart}T00:00:00Z`).order("created_at", { ascending: false }).limit(100),
    db.from("email_drafts").select("status,is_follow_up,created_at").order("created_at", { ascending: false }).limit(50),
    db.from("menu_items").select("category,name,price_label,active,sold_out").order("category").order("sort").limit(150),
  ]);

  const queryError = [settings, leads, events, payments, drafts, menu].find((result) => result.error)?.error;
  if (queryError) {
    console.error("owner kai data:", queryError);
    return NextResponse.json({ error: "Kai couldn't read the business data just now." }, { status: 502 });
  }

  const snapshot = {
    as_of: new Date().toISOString(),
    settings: settings.data,
    leads: leads.data || [],
    events_this_month_forward: events.data || [],
    payments_this_month: payments.data || [],
    email_draft_statuses: drafts.data || [],
    menu: normalizeLegacyMenuRows(menu.data || []),
  };

  try {
    const reply = await askClaude({
      system: `${SYSTEM}\n\nCURRENT BUSINESS SNAPSHOT:\n${JSON.stringify(snapshot)}`,
      messages,
      maxTokens: 900,
    });
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("owner kai:", error);
    return NextResponse.json({ error: "Kai's AI connection is temporarily unavailable." }, { status: 502 });
  }
}
