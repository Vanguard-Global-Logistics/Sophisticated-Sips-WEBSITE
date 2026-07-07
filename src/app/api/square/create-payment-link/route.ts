import { NextResponse } from "next/server";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";
import { createPaymentLink } from "@/lib/square/client";

export const runtime = "nodejs";

/** Amy creates a Square deposit/balance payment link for an event. */
export async function POST(req: Request) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  const { eventId, kind = "deposit", amountCents } = await req.json().catch(() => ({}));
  const amount = parseInt(amountCents);
  if (!eventId || !amount || amount < 100)
    return NextResponse.json({ error: "eventId and amountCents (≥100) required" }, { status: 400 });
  if (process.env.NEXT_PUBLIC_APP_ENV !== "production" && process.env.SQUARE_ENVIRONMENT === "production")
    return NextResponse.json({ error: "Blocked: this is the STAGING site but Square is set to production. Staging may only use the Square sandbox." }, { status: 403 });
  if (!["deposit", "balance", "full"].includes(kind))
    return NextResponse.json({ error: "kind must be deposit, balance, or full" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: ev } = await db.from("events").select("id,title").eq("id", eventId).single();
  if (!ev) return NextResponse.json({ error: "event not found" }, { status: 404 });

  try {
    const link = await createPaymentLink({
      name: `Sophisticated Sips — ${kind === "deposit" ? "Event Deposit" : kind === "full" ? "Event Payment (in full)" : "Event Balance"}`,
      amountCents: amount,
      note: ev.title,
    });
    await db.from("payments").insert({
      event_id: eventId, kind, amount_cents: amount, status: "pending",
      square_payment_link_id: link.paymentLinkId, square_order_id: link.orderId,
    });
    return NextResponse.json({ url: link.url });
  } catch (e: any) {
    console.error("square link:", e?.result ?? e);
    return NextResponse.json({ error: "Square couldn't create the link — check credentials and location id." }, { status: 502 });
  }
}
