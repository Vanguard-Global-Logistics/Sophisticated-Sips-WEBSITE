import { NextResponse, type NextRequest } from "next/server";
import { ownerEmail, supabaseAdmin } from "@/lib/database/supabase-server";
import { logAdmin } from "@/lib/database/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Markets worth chasing, and where each conversation stands. Sophie researches
 * and fills these in; Amy decides which to book. Owner-only, never public.
 */

const STATUSES = ["researching", "contacted", "applied", "accepted", "declined", "booked", "passed"] as const;

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const dateOrNull = (v: unknown): string | null => {
  const s = str(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const centsOrNull = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : null;
};

const intOrNull = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
};

const boolOrNull = (v: unknown): boolean | null =>
  v === true || v === false ? v : null;

function normalize(body: any): { row: any; error?: string } {
  const market_name = str(body?.market_name, 140);
  if (!market_name) return { row: null, error: "A market name is required." };
  const status = STATUSES.includes(body?.status) ? body.status : "researching";
  const priority = Number.isFinite(Number(body?.priority))
    ? Math.min(9999, Math.max(0, Math.round(Number(body.priority))))
    : 100;
  return {
    row: {
      market_name,
      organizer_name: str(body?.organizer_name, 140) || null,
      contact_email: str(body?.contact_email, 200) || null,
      contact_phone: str(body?.contact_phone, 40) || null,
      website: str(body?.website, 300) || null,
      location: str(body?.location, 200) || null,
      next_date: dateOrNull(body?.next_date),
      application_deadline: dateOrNull(body?.application_deadline),
      fee_cents: centsOrNull(body?.fee),
      expected_attendance: intOrNull(body?.expected_attendance),
      drink_exclusivity: boolOrNull(body?.drink_exclusivity),
      status,
      priority,
      last_contact: dateOrNull(body?.last_contact),
      next_action: str(body?.next_action, 300) || null,
      notes: str(body?.notes, 1000) || null,
    },
  };
}

/** GET — the whole pipeline, highest priority and soonest first. */
export async function GET() {
  if (!(await ownerEmail())) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const { data, error } = await db
    .from("event_pipeline")
    .select("*")
    .order("priority", { ascending: true })
    .order("next_date", { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

/** POST — create (no id) or update (with id) one market. */
export async function POST(req: NextRequest) {
  const email = await ownerEmail();
  if (!email) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }

  const { row, error: verr } = normalize(body);
  if (verr) return NextResponse.json({ error: verr }, { status: 400 });

  const id = str(body?.id, 60);
  if (id) {
    const { data, error } = await db
      .from("event_pipeline")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "That market is no longer in the pipeline." }, { status: 404 });
    await logAdmin(email, "event_pipeline_update", `${row.market_name} → ${row.status}`);
    return NextResponse.json({ item: data });
  }

  const { data, error } = await db.from("event_pipeline").insert(row).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdmin(email, "event_pipeline_create", row.market_name);
  return NextResponse.json({ item: data });
}

/** DELETE — drop a market by id (?id=… or JSON body {id}). */
export async function DELETE(req: NextRequest) {
  const email = await ownerEmail();
  if (!email) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });

  let id = str(new URL(req.url).searchParams.get("id"), 60);
  if (!id) { try { id = str((await req.json())?.id, 60); } catch {} }
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { error } = await db.from("event_pipeline").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdmin(email, "event_pipeline_delete", id);
  return NextResponse.json({ ok: true });
}
