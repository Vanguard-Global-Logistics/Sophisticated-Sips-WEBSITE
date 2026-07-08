import { NextResponse } from "next/server";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";
import { getPaymentStatusByOrder } from "@/lib/square/client";
import { applyPaidPayment } from "@/lib/database/payments";

export const runtime = "nodejs";

/** GET /api/square/payment-status?paymentId=... — live check + DB sync. */
export async function GET(req: Request) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  const paymentId = new URL(req.url).searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const { data: pay } = await db.from("payments").select("*").eq("id", paymentId).single();
  if (!pay?.square_order_id) return NextResponse.json({ error: "payment not found" }, { status: 404 });

  try {
    const status = await getPaymentStatusByOrder(pay.square_order_id);
    if (status.paid) await applyPaidPayment(db, pay);
    return NextResponse.json({ ...status, dbStatus: status.paid ? "paid" : pay.status });
  } catch (e) {
    console.error("square status:", e);
    return NextResponse.json({ error: "Couldn't reach Square." }, { status: 502 });
  }
}
