import { NextResponse } from "next/server";
import { captureChecklistLead } from "@/lib/leads/checklist";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "checklist"), 6, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a few minutes and try again." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (body.website) return NextResponse.json({ ok: true }); // honeypot

  const result = await captureChecklistLead(body.email, body.name);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
