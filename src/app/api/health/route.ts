import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/database/supabase-server";

export const runtime = "nodejs";

type DatabaseError = { code?: string; status?: number };

function classifyDatabaseError(error: DatabaseError): string {
  const code = String(error.code || error.status || "");
  if (["42P01", "PGRST205"].includes(code)) return "schema_missing";
  if (["401", "403", "42501", "PGRST301"].includes(code)) return "authorization_failed";
  if (["PGRST000", "PGRST001", "PGRST002", "PGRST003"].includes(code)) return "unavailable";
  return "query_failed";
}

/** Uptime/health probe for monitoring. Reports app + database reachability. */
export async function GET() {
  const started = Date.now();
  try {
    const db = supabaseAdmin();
    if (!db) return NextResponse.json({ status: "setup", db: "unconfigured", version: "1.0.0-rc.1" }, { status: 200 });
    const { error } = await db.from("menu_items").select("id").limit(1);
    if (error) {
      console.error("Database health check failed", {
        code: error.code || "unknown",
        status: (error as DatabaseError).status || "unknown",
      });
    }
    return NextResponse.json({
      status: error ? "degraded" : "ok",
      db: error ? classifyDatabaseError(error as DatabaseError) : "ok",
      latencyMs: Date.now() - started,
      version: "1.0.0-rc.1",
    }, { status: error ? 503 : 200 });
  } catch (error) {
    const cause = error as DatabaseError;
    console.error("Database health check threw", {
      code: cause.code || "unknown",
      status: cause.status || "unknown",
    });
    return NextResponse.json({ status: "down", db: "unreachable" }, { status: 503 });
  }
}
