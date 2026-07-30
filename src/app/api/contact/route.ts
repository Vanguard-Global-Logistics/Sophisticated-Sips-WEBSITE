import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/database/supabase-server";
import { sendContactReceipt } from "@/lib/email/resend";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "contact"), 6, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a few minutes and try again." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (body.website) return NextResponse.json({ ok: true });

  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  const phone = String(body.phone || "").trim().slice(0, 40);
  const subject = String(body.subject || "General question").trim().slice(0, 120);
  const message = String(body.message || "").trim().slice(0, 3000);

  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Name, valid email, and message are required." }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Contact service is temporarily unavailable." }, { status: 503 });

  const { data: inquiry, error: inquiryError } = await db.from("booking_requests").insert({
    name,
    email,
    phone: phone || null,
    event_type: `Contact: ${subject}`,
    notes: message,
    status: "new",
  }).select("id").single();

  if (inquiryError) {
    console.error("contact insert:", inquiryError);
    return NextResponse.json({ error: "Your message could not be saved. Please try again." }, { status: 500 });
  }

  const { error: leadError } = await db.from("leads").insert({
    booking_request_id: inquiry.id,
    name,
    contact_email: email,
    contact_phone: phone || null,
    event_type: subject,
    source: "contact",
    score: 45,
    status: "new",
  });
  if (leadError) console.error("contact lead:", leadError);

  await sendContactReceipt(email, name);
  return NextResponse.json({ ok: true });
}
