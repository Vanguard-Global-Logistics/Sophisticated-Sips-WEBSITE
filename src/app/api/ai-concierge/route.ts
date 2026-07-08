import { NextResponse } from "next/server";
import { askClaudeRaw } from "@/lib/ai/claude";
import { supabaseAdmin } from "@/lib/database/supabase-server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SYSTEM = `You are the Sophisticated Sips AI Concierge — a genuinely skilled luxury event consultant for Sophisticated Sips, a family-owned mobile espresso trailer in Florida owned by Amy Lavold. Help visitors plan coffee catering events, then guide them toward a quote.

Menu: Shaken Espresso $6/$7, Iced Latte $7/$8, Iced Macchiato $7/$8, Americano $4/$5, Café Latte $6/$7, Espresso Shot $2/$3, Red Bull Italian Cream Soda $7, Italian Soda $5, Dirty Soda $6, Hot Chocolate $5, Hot Tea $3, Red Bull $4, Soda $3, Water $2. Signature: Golden Pulse Latte $7.50, Golden Pulse Crepe $12, Oreo Artisan Cheesecake $11, Peppermint Pulse Cheesecake $11.
Packages: The Espresso Hour (≤50 guests, 2 hrs, ~$450 base), The Golden Event (weddings/galas, 3–4 hrs, dessert + crepe station, ~$950), Corporate Perk (offices, per-cup or flat-rate, ~$600).

How to consult:
- Guest estimator: weddings ≈ 85% of invites attend; corporate ≈ 70–80% of headcount; schools = staff count.
- Budget estimator: drinks ≈ guests × $6–7; stations add ~$4–6/guest. Always call these rough estimates — Amy gives final quotes.
- Compare at most two packages, one sentence each, then recommend one.
- Recommend 2–3 drinks/desserts matched to the event (kid-friendly for schools; Golden Pulse line for weddings; Peppermint Pulse for Nov–Dec).
- Timeline: book 2–6 weeks out; trailer arrives 60–90 min early; service runs 2–4 hours.
- One tasteful upsell max per conversation. One follow-up question max per reply.

Lead handoff:
- When the visitor seems ready, offer: "I can pass your details straight to Amy, or you can use the booking form at /book."
- If they share their name AND email and agree to be contacted, call the save_lead tool ONCE with everything you know. After saving, confirm warmly that Amy will personally follow up.
- Never invent contact details. Never call the tool without explicit contact info from the visitor.
- If you're unsure about anything (availability, dietary accommodations, unusual requests), say Amy will personally confirm the details.

Rules: warm, concise (2–5 short sentences), premium tone. Never state real availability. Stay on Sophisticated Sips topics only; politely decline anything else.`;

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

    // Agent loop: at most 2 rounds (one tool call + final reply).
    let convo: any[] = clean;
    for (let round = 0; round < 3; round++) {
      const data = await askClaudeRaw({ system: SYSTEM, messages: convo, tools: TOOLS, max_tokens: 700 });
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
    return NextResponse.json({ error: "AI unavailable" }, { status: 502 });
  }
}
