import { NextResponse } from "next/server";
import { askClaudeRaw, ClaudeError, NO_API_KEY } from "@/lib/ai/claude";
import { normalizeLegacyMenuRows, normalizeLegacyPackageRows } from "@/lib/catalog-guard";
import { supabaseAdmin } from "@/lib/database/supabase-server";
import { DEMO_MENU, DEMO_PACKAGES } from "@/lib/demo-data";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SYSTEM = `You are Kai, the Sophisticated Sips AI Concierge — a genuinely skilled luxury event consultant for Sophisticated Sips, a family-owned mobile espresso trailer in Florida owned by Amy Lavold. Help visitors plan coffee catering events, then guide them toward a quote.

How to consult:
- Guest estimator: weddings ≈ 85% of invites attend; corporate ≈ 70–80% of headcount; schools = staff count.
- Budget estimator: use only the supplied menu prices and package starting prices. Always call event totals rough estimates — Amy gives final quotes.
- Compare at most two packages, one sentence each, then recommend one.
- Recommend 2–3 choices matched to the event, using only items in the current catalog.
- One tasteful upsell max per conversation. One follow-up question max per reply.

Public appearances (walk-up locations, separate from private catered events):
- If UPCOMING PUBLIC APPEARANCES below is non-empty, you may proactively mention the soonest one early in the conversation — visitors often just want to know where to find the truck in person, not book a private event.
- If it's empty, say Amy doesn't have a public appearance scheduled right now, and offer to help book a private event instead.
- Never invent a location, date, or time — only use what's listed.

Lead handoff:
- When the visitor seems ready, offer: "I can pass your details straight to Amy, or you can use the booking form at /book."
- If they share their name AND email and agree to be contacted, call the save_lead tool ONCE with everything you know. After saving, confirm warmly that Amy will personally follow up.
- Never invent contact details. Never call the tool without explicit contact info from the visitor.
- If you're unsure about anything (availability, dietary accommodations, unusual requests), say Amy will personally confirm the details.

Rules: warm, concise (2–5 short sentences), premium tone. Never state real availability. Stay on Sophisticated Sips topics only; politely decline anything else.`;

const FALLBACK_CATALOG = {
  notice: "The live database is temporarily unavailable. These are Amy's approved flyer starting prices; Amy confirms final event quotes.",
  service_area: "Florida",
  menu: DEMO_MENU,
  packages: DEMO_PACKAGES,
};

async function upcomingAppearances(db: NonNullable<ReturnType<typeof supabaseAdmin>>) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db
    .from("public_appearances")
    .select("location_name,address,event_date,start_time,end_time,notes")
    .eq("active", true)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(10);
  if (error) { console.error("concierge appearances:", error); return []; }
  return data || [];
}

async function groundedSystem() {
  const db = supabaseAdmin();
  if (!db) return `${SYSTEM}\n\nCURRENT CATALOG:\n${JSON.stringify(FALLBACK_CATALOG)}\n\nUPCOMING PUBLIC APPEARANCES:\n[]`;

  const [menu, packages, settings] = await Promise.all([
    db.from("menu_items").select("category,name,price_label,description,is_signature,sold_out").eq("active", true).order("category").order("sort"),
    db.from("catering_packages").select("name,tag,description,bullet_points,base_price_cents").eq("active", true).order("sort"),
    db.from("business_settings").select("service_area,quote_rules,deposit_percent").eq("id", 1).maybeSingle(),
  ]);
  const appearances = await upcomingAppearances(db);
  if (menu.error || packages.error || settings.error) {
    console.error("concierge catalog:", menu.error || packages.error || settings.error);
    return `${SYSTEM}\n\nCURRENT CATALOG:\n${JSON.stringify(FALLBACK_CATALOG)}\n\nUPCOMING PUBLIC APPEARANCES:\n${JSON.stringify(appearances)}`;
  }

  return `${SYSTEM}

CURRENT CATALOG AND BUSINESS RULES:
${JSON.stringify({
  as_of: new Date().toISOString(),
  menu: normalizeLegacyMenuRows(menu.data || []),
  packages: normalizeLegacyPackageRows(packages.data || []),
  settings: settings.data,
})}

UPCOMING PUBLIC APPEARANCES:
${JSON.stringify(appearances)}

Use this catalog as the source of truth. Never recommend a sold-out item. Prices are menu/package starting points, not a final event quote.`;
}

const TOOLS = [{
  name: "save_lead",
  description: "Save a qualified visitor as a lead for Amy to follow up with. Only call when the visitor has explicitly shared their name and email and agreed to be contacted.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      event_type: { type: "string" },
      event_date: { type: "string", description: "YYYY-MM-DD if known" },
      guest_count: { type: "integer" },
      notes: { type: "string", description: "Anything useful from the conversation: preferences, budget, add-ons discussed" },
    },
    required: ["name", "email"],
  },
}];

async function saveLead(input: any) {
  const email = String(input.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Email looked invalid — ask the visitor to re-check it.";
  const guests = Math.max(0, Math.min(100000, parseInt(input.guest_count) || 0));
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const { error } = await db.from("leads").insert({
    name: String(input.name || "Website visitor").slice(0, 200),
    contact_email: email,
    contact_phone: String(input.phone || "").slice(0, 40) || null,
    event_type: String(input.event_type || "Inquiry").slice(0, 80),
    event_date: /^\d{4}-\d{2}-\d{2}$/.test(input.event_date || "") ? input.event_date : null,
    guest_count: guests || null,
    score: Math.min(95, 60 + Math.floor(guests / 4)),
    est_value_cents: guests ? Math.max(30000, guests * 900) : 30000,
    source: "concierge",
    status: guests >= 80 ? "hot" : "new",
  });
  if (error) { console.error("concierge lead:", error); return "Couldn't save right now — point them to the /book form."; }
  return `Lead saved. Amy will see it in her pipeline. Notes recorded: ${String(input.notes || "none").slice(0, 300)}`;
}

export async function POST(req: Request) {
  try {
    if (!rateLimit(clientKey(req, "concierge"), 20, 5 * 60_000))
      return NextResponse.json({ reply: "I'm getting a lot of questions right now — give me a minute, or head to /book and Amy will take it from there." }, { status: 429 });
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0)
      return NextResponse.json({ error: "messages required" }, { status: 400 });

    const clean = messages
      .slice(-12)
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    while (clean.length && clean[0].role === "assistant") clean.shift();
    if (clean.length === 0 || clean[clean.length - 1].role !== "user")
      return NextResponse.json({ error: "invalid conversation" }, { status: 400 });

    const system = await groundedSystem();

    // Agent loop: at most 2 rounds (one tool call + final reply).
    let convo: any[] = clean;
    for (let round = 0; round < 3; round++) {
      const data = await askClaudeRaw({ system, messages: convo, tools: TOOLS, max_tokens: 700 });
      const toolUse = (data.content || []).find((c: any) => c.type === "tool_use");
      const text = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");

      if (!toolUse || round === 2)
        return NextResponse.json({ reply: text || "I'm having a quiet moment — please try again." });

      const result = toolUse.name === "save_lead" ? await saveLead(toolUse.input) : "Unknown tool.";
      convo = [
        ...convo,
        { role: "assistant", content: data.content },
        { role: "user", content: [{ type: "tool_result", tool_use_id: toolUse.id, content: result }] },
      ];
    }
    return NextResponse.json({ reply: "I'm having a quiet moment — please try again." });
  } catch (e) {
    console.error("concierge:", e);
    // Surface why Kai is down. The status is safe to expose; the key is not,
    // and without it a misconfigured deployment is indistinguishable from a
    // rate limit — both just read as "I'm having a quiet moment".
    const status = e instanceof ClaudeError ? e.status : -1;
    const reply =
      status === NO_API_KEY || status === 401
        ? "I'm not connected to my brain right now — Amy needs to add the AI key. Meanwhile, head to /book and she'll take care of you personally."
        : status === 429
          ? "I'm getting a lot of questions right now — give me a minute, or head to /book and Amy will take it from there."
          : "I couldn't reach my notes just now. Head to /book and Amy will take care of you personally.";
    return NextResponse.json({ reply, code: status }, { status: 200 });
  }
}
