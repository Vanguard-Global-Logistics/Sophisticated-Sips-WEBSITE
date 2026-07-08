import { redirect } from "next/navigation";
import OwnerDashboard from "@/components/admin/OwnerDashboard";
import { requireOwner, isSupabaseConfigured } from "@/lib/database/supabase-server";
import SetupNeeded from "@/components/admin/SetupNeeded";

export const metadata = { title: "Owner Dashboard — Sophisticated Sips" };
export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded />;
  if (!(await requireOwner())) redirect("/owner/transfer"); // signed-in non-owners: pending-transfer landing or a clear no-access page
  return <OwnerDashboard />;
}
