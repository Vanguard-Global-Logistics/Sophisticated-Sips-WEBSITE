import { NextResponse } from "next/server";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";
import { createInvoice } from "@/lib/square/client";

export const runtime = "nodejs";

/** Amy sends a Square invoice by email for an event balance. */
export async function POST(req: Request) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  if (process.env.NEXT_PUBLIC_APP_ENV !== "production" && process.env.SQUARE_ENVIRONMENT === "production")
    return NextResponse.json({ error: "Blocked: staging may only use the Square sandbox." }, { status: 403 });
  const { eventId, amountCents, dueDate } = await req.json().catch(() => ({}));
  const amount = parseInt(amountCents);
  if (!eventId || !amount || amount < 100)
    return NextResponse.json({ error: "eventId and amountCents (≥100) required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: ev } = await db
    .from("events").select("id,title,lead_id, leads(contact_email,name)")
    .eq("id", eventId).single();
  if (!ev) return NextResponse.json({ error: "event not found" }, { status: 404 });
  const lead: any = Array.isArray(ev.leads) ? ev.leads[0] : ev.leads;
  if (!lead?.contact_email)
    return NextResponse.json({ error: "This event's lead has no email on file." }, { status: 400 });

  try {
    const inv = await createInvoice({
      customerEmail: lead.contact_email,
      customerName: lead.name || "Valued Client",
      title: ev.title,
      amountCents: amount,
      dueDate,
    });
    await db.from("payments").insert({
      event_id: eventId, kind: "invoice", amount_cents: amount, status: "pending",
      square_invoice_id: inv.invoiceId, square_order_id: inv.orderId,
    });
    return NextResponse.json({ ok: true, invoiceUrl: inv.publicUrl, status: inv.status });
  } catch (e: any) {
    console.error("square invoice:", e?.result ?? e);
    return NextResponse.json({ error: "Square couldn't create the invoice." }, { status: 502 });
  }
}
