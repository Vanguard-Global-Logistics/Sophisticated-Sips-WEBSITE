import { NextResponse } from "next/server";
import { ownerEmail, supabaseAdmin } from "@/lib/database/supabase-server";
import { logAdmin } from "@/lib/database/audit";

export const runtime = "nodejs";

const EDITABLE = ["business_name","owner_name","phone","mailing_address","service_area","domain","deposit_percent","quote_rules","cancellation_policy","wizard"] as const;

export async function GET() {
  if (!(await ownerEmail())) return NextResponse.json({ error: "owner only" }, { status: 401 });
  const { data } = await supabaseAdmin().from("business_settings").select("*").eq("id", 1).single();
  return NextResponse.json({ settings: data });
}

export async function PUT(req: Request) {
  const actor = await ownerEmail();
  if (!actor) return NextResponse.json({ error: "owner only" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE) if (k in body) patch[k] = body[k];
  if ("deposit_percent" in patch) {
    const n = parseInt(String(patch.deposit_percent));
    if (!n || n < 5 || n > 100) return NextResponse.json({ error: "Deposit must be between 5% and 100%." }, { status: 400 });
    patch.deposit_percent = n;
  }
  patch.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin().from("business_settings").update(patch).eq("id", 1);
  if (error) return NextResponse.json({ error: "Couldn't save settings." }, { status: 500 });
  await logAdmin(actor, "settings.update", Object.keys(patch).filter((k) => k !== "updated_at").join(", "));
  return NextResponse.json({ ok: true });
}
