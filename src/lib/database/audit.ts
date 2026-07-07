import { supabaseAdmin } from "./supabase-server";

/** Append-only trail of sensitive admin actions. Never throws (auditing must not break the action). */
export async function logAdmin(actorEmail: string, action: string, details = "") {
  try {
    await supabaseAdmin().from("admin_audit_log").insert({
      actor_email: actorEmail.toLowerCase(),
      action: action.slice(0, 120),
      details: details.slice(0, 2000),
    });
  } catch (e) { console.error("audit:", e); }
}
