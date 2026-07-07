import { NextResponse } from "next/server";
import { ownerEmail, supabaseAdmin } from "@/lib/database/supabase-server";

export const runtime = "nodejs";

/** Connection status for the setup wizard. Booleans and safe labels ONLY — never secret values. */
export async function GET() {
  if (!(await ownerEmail())) return NextResponse.json({ error: "owner only" }, { status: 401 });

  const db = supabaseAdmin();
  const [{ data: owners }, { data: transfer }] = await Promise.all([
    db.from("owners").select("email").order("email"),
    db.from("owner_transfer_requests").select("*").in("status", ["pending", "confirmed"]).order("created_at", { ascending: false }).limit(1),
  ]);

  const appEnv = process.env.NEXT_PUBLIC_APP_ENV === "production" ? "production" : "staging";
  const squareEnv = process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";
  return NextResponse.json({
    appEnv,
    envWarning:
      appEnv === "staging" && squareEnv === "production" ? "Staging site with PRODUCTION Square — payment creation is blocked until this is fixed." :
      appEnv === "production" && squareEnv === "sandbox" ? "LIVE site with SANDBOX Square — customers cannot actually pay. Switch Square to production." : null,
    supabase: true, // this response existing proves it
    square: {
      configured: !!process.env.SQUARE_ACCESS_TOKEN && !!process.env.SQUARE_LOCATION_ID,
      environment: process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox",
      webhookKeySet: !!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    },
    email: {
      configured: !!process.env.RESEND_API_KEY,
      from: process.env.OUTREACH_FROM || null, // an address, not a secret
    },
    ai: { configured: !!process.env.ANTHROPIC_API_KEY },
    weather: { configured: !!process.env.BUSINESS_LAT && !!process.env.BUSINESS_LON },
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    owners: (owners || []).map((o) => o.email),
    activeTransfer: transfer?.[0] || null,
  });
}
