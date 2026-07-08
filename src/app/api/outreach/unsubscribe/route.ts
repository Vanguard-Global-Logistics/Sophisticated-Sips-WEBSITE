import { supabaseAdmin } from "@/lib/database/supabase-server";
import { verifyUnsubToken } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";

/** One-click unsubscribe. Adds to suppression, kills pending drafts, marks leads declined. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const email = verifyUnsubToken(token);
  const html = (msg: string) =>
    new Response(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;background:#0A2423;color:#F6EFE3;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px"><div><h2 style="color:#C9A45C">Sophisticated Sips</h2><p>${msg}</p></div></body>`,
      { headers: { "Content-Type": "text/html" } });

  if (!email) return html("This unsubscribe link is invalid or expired.");

  const db = supabaseAdmin();
  if (!db) return html("This site isn't fully set up yet — please try again later.");
  await db.from("suppression_list").upsert({ email, reason: "unsubscribed" });
  await db.from("email_drafts").update({ status: "blocked", decided_at: new Date().toISOString() }).eq("to_email", email).eq("status", "pending");
  await db.from("leads").update({ status: "declined" }).eq("contact_email", email);
  await db.from("outreach_logs").insert({ to_email: email, action: "unsubscribed", detail: "Recipient clicked unsubscribe" });

  return html("You've been unsubscribed. We won't email you again — and thank you for your time.");
}
