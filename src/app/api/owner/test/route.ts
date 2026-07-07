import { NextResponse } from "next/server";
import { ownerEmail } from "@/lib/database/supabase-server";
import { logAdmin } from "@/lib/database/audit";
import { askClaude } from "@/lib/ai/claude";
import { square, LOCATION_ID } from "@/lib/square/client";
import { Resend } from "resend";

export const runtime = "nodejs";

/** One-tap connection tests for the setup wizard. */
export async function POST(req: Request) {
  const actor = await ownerEmail();
  if (!actor) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const { kind } = await req.json().catch(() => ({}));

  try {
    if (kind === "email") {
      const r = new Resend(process.env.RESEND_API_KEY!);
      const { error } = await r.emails.send({
        from: process.env.OUTREACH_FROM!, to: actor,
        subject: "Sophisticated Sips — test email ✦",
        text: "This is your setup-wizard test email. If you're reading this, email sending works.",
      });
      if (error) throw new Error(error.message);
      await logAdmin(actor, "test.email", `sent to ${actor}`);
      return NextResponse.json({ ok: true, message: `Test email sent to ${actor} — check your inbox (and spam, the first time).` });
    }
    if (kind === "ai") {
      const reply = await askClaude({
        system: "Reply with exactly one short warm sentence confirming the Sophisticated Sips AI is connected.",
        messages: [{ role: "user", content: "Connection test." }], maxTokens: 60,
      });
      await logAdmin(actor, "test.ai", "ok");
      return NextResponse.json({ ok: true, message: reply });
    }
    if (kind === "square") {
      const { result } = await square().locationsApi.retrieveLocation(LOCATION_ID());
      await logAdmin(actor, "test.square", `location ${result.location?.name}`);
      return NextResponse.json({ ok: true, message: `Square connected — location "${result.location?.name}" (${process.env.SQUARE_ENVIRONMENT === "production" ? "PRODUCTION" : "sandbox"}).` });
    }
    return NextResponse.json({ error: "kind must be email, ai, or square" }, { status: 400 });
  } catch (e: any) {
    console.error("owner test:", e);
    return NextResponse.json({ ok: false, message: `Not connected yet: ${String(e?.message || e).slice(0, 200)}` }, { status: 502 });
  }
}
