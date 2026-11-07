import { NextResponse } from "next/server";
import { requireOwner, supabaseAdmin } from "@/lib/database/supabase-server";
import {
  createInvoiceDraft,
  publishInvoiceDraft,
} from "@/lib/square/client";
import {
  createTrackedInvoice,
  InvoicePublishError,
} from "@/lib/payments/create-tracked-invoice";
import { PaymentPersistenceError } from "@/lib/payments/create-tracked-payment-link";

export const runtime = "nodejs";

/** Amy sends a Square invoice by email for an event balance. */
export async function POST(req: Request) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  if (process.env.NEXT_PUBLIC_APP_ENV !== "production" && process.env.SQUARE_ENVIRONMENT === "production")
    return NextResponse.json({ error: "Blocked: staging may only use the Square sandbox." }, { status: 403 });

  const { eventId, amountCents, dueDate } = await req.json().catch(() => ({}));
  const amount = typeof amountCents === "string" && /^\d+$/.test(amountCents)
    ? Number(amountCents) : amountCents;
  if (!eventId || !Number.isSafeInteger(amount) || amount < 100)
    return NextResponse.json({ error: "eventId and integer amountCents (≥100) required" }, { status: 400 });
  if (dueDate !== undefined && (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)))
    return NextResponse.json({ error: "dueDate must use YYYY-MM-DD" }, { status: 400 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const { data: ev, error: eventError } = await db
    .from("events").select("id,title,lead_id, leads(contact_email,name)")
    .eq("id", eventId).single();
  if (eventError) {
    console.error("invoice event lookup:", eventError);
    return NextResponse.json({ error: "Could not load the event." }, { status: 502 });
  }
  if (!ev) return NextResponse.json({ error: "event not found" }, { status: 404 });
  const lead: any = Array.isArray(ev.leads) ? ev.leads[0] : ev.leads;
  if (!lead?.contact_email)
    return NextResponse.json({ error: "This event's lead has no email on file." }, { status: 400 });

  try {
    const inv = await createTrackedInvoice({
      createDraft: () => createInvoiceDraft({
        customerEmail: lead.contact_email,
        customerName: lead.name || "Valued Client",
        title: ev.title,
        amountCents: amount,
        dueDate,
      }),
      persist: (draft) => db.from("payments").insert({
        event_id: eventId,
        kind: "invoice",
        amount_cents: amount,
        status: "pending",
        square_invoice_id: draft.invoiceId,
        square_order_id: draft.orderId,
      }),
      publish: publishInvoiceDraft,
    });
    return NextResponse.json({ ok: true, invoiceUrl: inv.publicUrl, status: inv.status });
  } catch (e: any) {
    if (e instanceof PaymentPersistenceError) {
      console.error("invoice payment record:", e.persistenceError);
      return NextResponse.json({
        error: "Invoice draft could not be safely recorded, so it was not sent. Check the database before retrying.",
      }, { status: 502 });
    }
    if (e instanceof InvoicePublishError) {
      console.error("invoice publish:", e.publishError);
      return NextResponse.json({
        error: "Invoice was recorded but Square could not send it. Check Square before retrying.",
      }, { status: 502 });
    }
    console.error("square invoice:", e?.result ?? e);
    return NextResponse.json({ error: "Square couldn't create the invoice." }, { status: 502 });
  }
}
