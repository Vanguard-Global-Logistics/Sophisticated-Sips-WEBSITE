import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ownerEmail, supabaseAdmin } from "@/lib/database/supabase-server";
import { logAdmin } from "@/lib/database/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Push menu edits to the public, ISR-cached pages immediately after a change. */
function refreshPublicMenu() {
  revalidatePath("/menu");
  revalidatePath("/menu/print");
  revalidatePath("/");
}

/**
 * Owner menu CRUD — the manual, AI-independent backbone of the Menu Editor.
 * Uses the service-role client after an owner gate, so it works for both
 * owners-table owners and the OWNER_EMAIL break-glass owner (which RLS alone
 * would not authorize). No Anthropic dependency: pure data in / data out.
 *
 * Reusable across Throne OS: a plain product-catalog CRUD keyed by category.
 */

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const clampSort = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(9999, Math.max(0, Math.round(n))) : 100;
};

type MenuRow = {
  id?: string;
  category: string;
  name: string;
  price_label: string;
  description: string | null;
  is_signature: boolean;
  sort: number;
  active: boolean;
  sold_out: boolean;
  photo_url: string | null;
};

/** Normalize an arbitrary request body into a validated menu row (no id). */
function normalize(body: any): { row: Omit<MenuRow, "id">; error?: string } {
  const name = str(body?.name, 120);
  const price_label = str(body?.price_label, 80);
  const category = str(body?.category, 60) || "Signature";
  if (!name) return { row: null as any, error: "Name is required." };
  if (!price_label) return { row: null as any, error: "Price is required." };
  const photo = str(body?.photo_url, 500);
  return {
    row: {
      category,
      name,
      price_label,
      description: str(body?.description, 400) || null,
      is_signature: body?.is_signature === true || category === "Signature",
      sort: clampSort(body?.sort),
      active: body?.active !== false, // default available
      sold_out: body?.sold_out === true,
      photo_url: photo || null,
    },
  };
}

/** GET — full menu, ordered the way the public page and editor expect. */
export async function GET() {
  if (!(await ownerEmail())) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });
  const { data, error } = await db
    .from("menu_items")
    .select("*")
    .order("category", { ascending: true })
    .order("sort", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

/** POST — create (no id) or update (with id) a single item. */
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
    const { data, error } = await db.from("menu_items").update(row).eq("id", id).select("*").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "That item no longer exists." }, { status: 404 });
    await logAdmin(email, "menu_update", `${row.name} (${row.price_label})`);
    refreshPublicMenu();
    return NextResponse.json({ item: data });
  }

  const { data, error } = await db.from("menu_items").insert(row).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdmin(email, "menu_create", `${row.name} (${row.price_label})`);
  refreshPublicMenu();
  return NextResponse.json({ item: data });
}

/** DELETE — remove an item by id (?id=… or JSON body {id}). */
export async function DELETE(req: NextRequest) {
  const email = await ownerEmail();
  if (!email) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });

  let id = str(new URL(req.url).searchParams.get("id"), 60);
  if (!id) { try { id = str((await req.json())?.id, 60); } catch {} }
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { error } = await db.from("menu_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdmin(email, "menu_delete", id);
  refreshPublicMenu();
  return NextResponse.json({ ok: true });
}
