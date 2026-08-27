import { supabaseAdmin } from "@/lib/database/supabase-server";
import { notifyOwnerNewLead, sendChecklistEmail } from "@/lib/email/resend";
import { rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type ChecklistResult = { ok: true } | { ok: false; error: string };

/**
 * Shared by Kai's send_checklist tool and the standalone /checklist opt-in
 * form — one pipeline no matter how someone asks for the lead magnet:
 * save the lead, email the PDF instantly, let Amy know it happened.
 *
 * Rate-limited per recipient address (not just per caller IP) so this can't
 * become a mini spam-relay against one target — no combination of tricking
 * Kai's chat or hammering the form can push repeat sends past this limit.
 */
export async function captureChecklistLead(rawEmail: string, rawName?: string): Promise<ChecklistResult> {
  const email = String(rawEmail || "").trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) return { ok: false, error: "That email doesn't look valid." };
  if (!rateLimit(`checklist-email:${email}`, 2, 30 * 60_000))
    return { ok: false, error: "That email was already sent the checklist recently — check the inbox (and spam folder)." };
  const name = String(rawName || "").trim().slice(0, 200) || undefined;

  const db = supabaseAdmin();
  if (!db) return { ok: false, error: "Service not configured yet." };

  const { error } = await db.from("leads").insert({
    name: name || "Checklist opt-in",
    contact_email: email,
    event_type: "Lead magnet",
    source: "checklist_optin",
    score: 40,
    est_value_cents: 30000,
    status: "new",
  });
  if (error) {
    console.error("captureChecklistLead insert:", error);
    return { ok: false, error: "Couldn't save that just now — please try again." };
  }

  try {
    await sendChecklistEmail(email, name);
  } catch (e) {
    // Lead is already saved — Amy can still follow up manually — but the
    // visitor needs to know the PDF itself didn't actually go out.
    console.error("sendChecklistEmail:", e);
    return { ok: false, error: "Saved, but the email couldn't be sent right now — please try again in a bit." };
  }
  await notifyOwnerNewLead({ name: name || email, email, source: "checklist_optin" });

  return { ok: true };
}
