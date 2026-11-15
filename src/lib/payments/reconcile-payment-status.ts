import type { SupabaseClient } from "@supabase/supabase-js";

export type SquareOrderStatus = {
  orderState: string;
  paid: boolean;
  totalCents: number;
};

export class PaymentLookupError extends Error {
  override cause?: unknown;

  constructor(cause: unknown) {
    super("Payment records are temporarily unavailable.");
    this.name = "PaymentLookupError";
    this.cause = cause;
  }
}

export class PaymentRecordNotFoundError extends Error {
  constructor() {
    super("Payment record not found.");
    this.name = "PaymentRecordNotFoundError";
  }
}

export class PaymentReconciliationError extends Error {
  override cause?: unknown;

  constructor(cause: unknown) {
    super("Square shows this payment as paid, but local records could not be updated.");
    this.name = "PaymentReconciliationError";
    this.cause = cause;
  }
}

export async function reconcilePaymentStatus(
  db: SupabaseClient,
  paymentId: string,
  dependencies: {
    getStatus: (orderId: string) => Promise<SquareOrderStatus>;
    applyPaid: (db: SupabaseClient, payment: any) => Promise<boolean>;
  },
) {
  let lookup: Awaited<ReturnType<typeof lookupPayment>>;

  try {
    lookup = await lookupPayment(db, paymentId);
  } catch (error) {
    throw new PaymentLookupError(error);
  }

  if (lookup.error) throw new PaymentLookupError(lookup.error);

  const payment = lookup.data;
  if (!payment?.square_order_id) throw new PaymentRecordNotFoundError();

  const status = await dependencies.getStatus(payment.square_order_id);

  if (status.paid) {
    try {
      await dependencies.applyPaid(db, payment);
    } catch (error) {
      throw new PaymentReconciliationError(error);
    }
  }

  return {
    ...status,
    dbStatus: status.paid ? "paid" : payment.status,
  };
}

function lookupPayment(db: SupabaseClient, paymentId: string) {
  return db.from("payments").select("*").eq("id", paymentId).single();
}
