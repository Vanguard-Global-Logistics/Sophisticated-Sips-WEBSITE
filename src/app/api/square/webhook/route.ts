import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/database/supabase-server";
import { verifySquareWebhook } from "@/lib/square/client";
import { applyPaidPayment } from "@/lib/database/payments";

export const runtime = "nodejs";

/** Square webhook: subscribe to payment.updated and invoice.payment_made.
 *  Notification URL must be exactly ${NEXT_PUBLIC_SITE_URL}/api/square/webhook */
export async function POST(req: Request) {
  const raw = await req.text();
  const ok = verifySquareWebhook(
    raw,
    req.headers.get("x-square-hmacsha256-signature"),
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/square/webhook`
  );
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  const event = JSON.parse(raw);
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });

  const markPaid = async (col: "square_order_id" | "square_invoice_id", val: string) => {
    const { data: pay } = await db.from("payments").select("*").eq(col, val).maybeSingle();
    await applyPaidPayment(db, pay);
  };

  try {
    if (event.type === "payment.updated") {
      const p = event.data?.object?.payment;
      if (p?.status === "COMPLETED" && p.order_id) await markPaid("square_order_id", p.order_id);
    }
    if (event.type === "invoice.payment_made") {
      const inv = event.data?.object?.invoice;
      if (inv?.id) await markPaid("square_invoice_id", inv.id);
    }
  } catch (e) {
    console.error("square webhook:", e);
  }
  return NextResponse.json({ received: true });
}
