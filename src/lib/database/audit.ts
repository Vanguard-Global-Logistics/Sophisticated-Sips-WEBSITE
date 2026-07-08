import { supabaseAdmin } from "@/lib/database/supabase-server";

export async function logAdmin(
  actorEmail: string,
  action: string,
  details = ""
) {
  try {
    const db = supabaseAdmin();

    if (!db) {
      return;
    }

    await db.from("admin_audit_log").insert({
      actor_email: actorEmail.toLowerCase(),
      action: action.slice(0, 120),
      details: details.slice(0, 2000),
    });
  } catch {
    // Never let audit logging break the app.
  }
}