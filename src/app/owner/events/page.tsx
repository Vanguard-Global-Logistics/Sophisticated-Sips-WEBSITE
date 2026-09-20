import { redirect } from "next/navigation";
import { requireOwner, isSupabaseConfigured } from "@/lib/database/supabase-server";
import SetupNeeded from "@/components/admin/SetupNeeded";
import EventLedger from "@/components/admin/EventLedger";

export const metadata = { title: "Event Ledger — Sophisticated Sips" };
export const dynamic = "force-dynamic";

export default async function OwnerEventsPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded />;
  if (!(await requireOwner())) redirect("/owner");
  return <EventLedger />;
}
