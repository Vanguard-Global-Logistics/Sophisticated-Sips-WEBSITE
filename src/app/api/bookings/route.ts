import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/database/supabase-server";
import {
  BookingPersistenceError,
  createBookingPipeline,
} from "@/lib/bookings/create-booking-pipeline";
import { isBookableEventDate } from "@/lib/bookings/validate-event-date";
import { sendBookingReceipt } from "@/lib/email/resend";
import { policyAcknowledgementLine } from "@/lib/policies/cancellation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "bookings"), 8, 10 * 60_000))
    return NextResponse.json({ error: "Too many requests — please wait a few minutes and try again." }, { status: 429 });
  const f = await req.json().catch(() => null);
  if (!f) return NextResponse.json({ error: "bad request" }, { status: 400 });

  // Honeypot: real users never fill this hidden field.
  if (f.website) return NextResponse.json({ ok: true });

  const name = String(f.name || "").trim().slice(0, 120);
  const email = String(f.email || "").trim().slice(0, 200);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !f.event_date)
    return NextResponse.json({ error: "Name, valid email, and event date are required." }, { status: 400 });
  if (!isBookableEventDate(f.event_date))
    return NextResponse.json({ error: "Event date must be a valid upcoming date." }, { status: 400 });
  if (f.policy_accepted !== true)
    return NextResponse.json({ error: "Please accept the cancellation, rescheduling, and refund policy before submitting." }, { status: 400 });

  const guests = Math.max(0, Math.min(100000, parseInt(f.guest_count) || 0));
  const phone = String(f.phone || "").slice(0, 40);
  const notes = [
    String(f.notes || "").slice(0, 1800),
    policyAcknowledgementLine(),
  ].filter(Boolean).join("\n\n").slice(0, 2000);
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });

  const booking = {
    name,
    email,
    company: String(f.company || "").slice(0, 200),
    phone,
    event_type: String(f.event_type || "").slice(0, 80),
    event_date: f.event_date,
    event_time: String(f.event_time || "").slice(0, 20),
    location: String(f.location || "").slice(0, 300),
    guest_count: guests,
    budget_range: String(f.budget_range || "").slice(0, 60),
    package_interest: String(f.package_interest || "").slice(0, 120),
    drink_preferences: String(f.drink_preferences || "").slice(0, 500),
    addons: String(f.addons || "").slice(0, 500),
    notes,
  };

  // Create the public request and sales-pipeline lead in one database transaction.
  const estValue = Math.max(30000, guests * 900); // ≥$300, ~$9/guest
  const lead = {
    name: f.company ? `${f.company} (${name})` : name,
    contact_email: email,
    contact_phone: phone || null,
    event_type: String(f.event_type || "").slice(0, 80),
    event_date: f.event_date,
    guest_count: guests,
    score: Math.min(95, 55 + Math.floor(guests / 4)),
    est_value_cents: estValue,
    source: "website",
    status: guests >= 80 ? "hot" : "new",
  };

  try {
    await createBookingPipeline(db, booking, lead);
  } catch (error) {
    if (error instanceof BookingPersistenceError) {
      console.error("booking pipeline:", error.persistenceError);
      return NextResponse.json({ error: "Could not save your request — please try again." }, { status: 500 });
    }
    throw error;
  }

  // Awaited: serverless platforms may kill un-awaited work after the response.
  await sendBookingReceipt(email, name);
  return NextResponse.json({ ok: true });
}
