import type { SupabaseClient } from "@supabase/supabase-js";

function assertMutationSucceeded(result: { error: unknown | null }, operation: string) {
  if (!result.error) return;
  const error = new Error(`Payment reconciliation failed during ${operation}.`);
  (error as Error & { cause?: unknown }).cause = result.error;
  throw error;
}

/**
 * Marks a payment paid and reasserts the matching event flag.
 *
 * Event flags are written first so a later payment-row failure remains retryable.
 * Paid rows still reassert their event flags, allowing duplicate webhooks or manual
 * status checks to repair a previously incomplete event update.
 */
export async function applyPaidPayment(db: SupabaseClient, pay: any) {
  if (!pay) return false;

  if (pay.event_id) {
    const flags =
      pay.kind === "deposit" ? { deposit_paid: true } :
      pay.kind === "full" ? { deposit_paid: true, balance_paid: true } :
      { balance_paid: true };
    const eventResult = await db.from("events").update(flags).eq("id", pay.event_id);
    assertMutationSucceeded(eventResult, "event update");
  }

  if (pay.status === "paid") return false;

  const paymentResult = await db.from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", pay.id);
  assertMutationSucceeded(paymentResult, "payment update");
  return true;
}
