import { NextResponse } from "next/server";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";
import { getPaymentStatusByOrder } from "@/lib/square/client";
import { applyPaidPayment } from "@/lib/database/payments";
import {
  PaymentLookupError,
  PaymentRecordNotFoundError,
  PaymentReconciliationError,
  reconcilePaymentStatus,
} from "@/lib/payments/reconcile-payment-status";

export const runtime = "nodejs";

/** GET /api/square/payment-status?paymentId=... — live check + DB sync. */
export async function GET(req: Request) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  const paymentId = new URL(req.url).searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });

  try {
    const status = await reconcilePaymentStatus(db, paymentId, {
      getStatus: getPaymentStatusByOrder,
      applyPaid: applyPaidPayment,
    });
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof PaymentRecordNotFoundError) {
      return NextResponse.json({ error: "payment not found" }, { status: 404 });
    }

    if (error instanceof PaymentLookupError) {
      console.error("payment status lookup:", error.cause);
      return NextResponse.json(
        { error: "Payment records are temporarily unavailable. Try again." },
        { status: 503 },
      );
    }

    if (error instanceof PaymentReconciliationError) {
      console.error("payment status reconciliation:", error.cause);
      return NextResponse.json(
        { error: "Square shows paid, but records couldn't be updated. Try Check payment again." },
        { status: 503 },
      );
    }

    console.error("square status:", error);
    return NextResponse.json({ error: "Couldn't reach Square." }, { status: 502 });
  }
}
