import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ownerEmail, supabaseAdmin } from "@/lib/database/supabase-server";
import { logAdmin } from "@/lib/database/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Push appearance edits everywhere they're shown immediately after a change. */
function refreshPublicAppearances() {
  revalidatePath("/");
}

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const clampSort = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(9999, Math.max(0, Math.round(n))) : 100;
};

type AppearanceRow = {
  id?: string;
  location_name: string;
  address: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  active: boolean;
  sort: number;
};

function normalize(body: any): { row: Omit<AppearanceRow, "id">; error?: string } {
  const location_name = str(body?.location_name, 120);
  const event_date = str(body?.event_date, 10);
  if (!location_name) return { row: null as any, error: "Location name is required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) return { row: null as any, error: "A valid date (YYYY-MM-DD) is required." };
  return {
    row: {
      location_name,
      address: str(body?.address, 240) || null,
      event_date,
      start_time: str(body?.start_time, 40) || null,
      end_time: str(body?.end_time, 40) || null,
      notes: str(body?.notes, 400) || null,
      active: body?.active !== false, // default visible
      sort: clampSort(body?.sort),
    },
  };
}

/** GET — every appearance, soonest first (owner view; public callers use Supabase directly). */
export async function GET() {
  if (!(await ownerEmail())) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const { data, error } = await db
    .from("public_appearances")
    .select("*")
    .order("event_date", { ascending: true })
    .order("sort", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

/** POST — create (no id) or update (with id) a single appearance. */
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
    const { data, error } = await db.from("public_appearances").update(row).eq("id", id).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "That appearance no longer exists." }, { status: 404 });
    await logAdmin(email, "appearance_update", `${row.location_name} (${row.event_date})`);
    refreshPublicAppearances();
    return NextResponse.json({ item: data });
  }

  const { data, error } = await db.from("public_appearances").insert(row).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdmin(email, "appearance_create", `${row.location_name} (${row.event_date})`);
  refreshPublicAppearances();
  return NextResponse.json({ item: data });
}

/** DELETE — remove an appearance by id (?id=… or JSON body {id}). */
export async function DELETE(req: NextRequest) {
  const email = await ownerEmail();
  if (!email) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });

  let id = str(new URL(req.url).searchParams.get("id"), 60);
  if (!id) { try { id = str((await req.json())?.id, 60); } catch {} }
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { error } = await db.from("public_appearances").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdmin(email, "appearance_delete", id);
  refreshPublicAppearances();
  return NextResponse.json({ ok: true });
}
