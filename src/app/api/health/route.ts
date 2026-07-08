import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/database/supabase-server";

export const runtime = "nodejs";

/** Uptime/health probe for monitoring. Reports app + database reachability. */
export async function GET() {
  const started = Date.now();
  try {
    const db = supabaseAdmin();
    if (!db) return NextResponse.json({ status: "setup", db: "unconfigured", version: "1.0.0-rc.1" }, { status: 200 });
    const { error } = await db.from("menu_items").select("id").limit(1);
    return NextResponse.json({
      status: error ? "degraded" : "ok",
      db: error ? "unreachable" : "ok",
      latencyMs: Date.now() - started,
      version: "1.0.0-rc.1",
    }, { status: error ? 503 : 200 });
  } catch {
    return NextResponse.json({ status: "down", db: "unreachable" }, { status: 503 });
  }
}
