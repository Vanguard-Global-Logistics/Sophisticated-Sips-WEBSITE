import type { SupabaseClient } from "@supabase/supabase-js";

/** Marks a payment paid and flips the matching event flag. Idempotent. */
export async function applyPaidPayment(db: SupabaseClient, pay: any) {
  if (!pay || pay.status === "paid") return false;
  await db.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", pay.id);
  if (pay.event_id) {
    const flags =
      pay.kind === "deposit" ? { deposit_paid: true } :
      pay.kind === "full" ? { deposit_paid: true, balance_paid: true } :
      { balance_paid: true };
    await db.from("events").update(flags).eq("id", pay.event_id);
  }
  return true;
}
