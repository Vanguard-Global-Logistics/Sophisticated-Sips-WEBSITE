import { NextResponse, type NextRequest } from "next/server";
import { ownerEmail, supabaseAdmin } from "@/lib/database/supabase-server";
import { logAdmin } from "@/lib/database/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What each trading day actually earned. Square only sees card; cash is about a
 * quarter of takings and market fees are invisible to it, so this is the only
 * place the real number lives. Owner-only, never public.
 */

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** Amy types dollars; the database stores integer cents. */
const cents = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
};

const intOrNull = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
};

type Row = {
  appearance_id: string | null;
  venue_name: string;
  event_date: string;
  card_cents: number;
  cash_cents: number;
  gift_card_cents: number;
  fee_cents: number;
  tips_cents: number;
  drink_vendors: number | null;
  weather: string | null;
  notes: string | null;
};

function normalize(body: any): { row: Row; error?: string } {
  const venue_name = str(body?.venue_name, 120);
  const event_date = str(body?.event_date, 10);
  if (!venue_name) return { row: null as any, error: "Which event was it? A venue name is required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) return { row: null as any, error: "A valid date (YYYY-MM-DD) is required." };
  return {
    row: {
      appearance_id: str(body?.appearance_id, 60) || null,
      venue_name,
      event_date,
      card_cents: cents(body?.card),
      cash_cents: cents(body?.cash),
      gift_card_cents: cents(body?.gift_cards),
      fee_cents: cents(body?.fee),
      tips_cents: cents(body?.tips),
      drink_vendors: intOrNull(body?.drink_vendors),
      weather: str(body?.weather, 80) || null,
      notes: str(body?.notes, 400) || null,
    },
  };
}

/** GET — every result, most recent first. */
export async function GET() {
  if (!(await ownerEmail())) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const { data, error } = await db
    .from("event_results")
    .select("*")
    .order("event_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

/** POST — create (no id) or update (with id) one day's takings. */
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
      .from("event_results")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "That event no longer exists." }, { status: 404 });
    await logAdmin(email, "event_result_update", `${row.venue_name} (${row.event_date})`);
    return NextResponse.json({ item: data });
  }

  const { data, error } = await db.from("event_results").insert(row).select("*").maybeSingle();
  if (error) {
    // The (venue, date) uniqueness guard — one row per trading day.
    if ((error as any).code === "23505") {
      return NextResponse.json({ error: "That venue and date is already recorded. Edit the existing row instead." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await logAdmin(email, "event_result_create", `${row.venue_name} (${row.event_date})`);
  return NextResponse.json({ item: data });
}

/** DELETE — remove one day by id (?id=… or JSON body {id}). */
export async function DELETE(req: NextRequest) {
  const email = await ownerEmail();
  if (!email) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });

  let id = str(new URL(req.url).searchParams.get("id"), 60);
  if (!id) { try { id = str((await req.json())?.id, 60); } catch {} }
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { error } = await db.from("event_results").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdmin(email, "event_result_delete", id);
  return NextResponse.json({ ok: true });
}
