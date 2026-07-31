import { redirect } from "next/navigation";
import OwnerDashboard from "@/components/admin/OwnerDashboard";
import { reconcileAmyFlyerCatalog } from "@/lib/database/catalog-migration";
import { requireOwner, isSupabaseConfigured, supabaseAdmin } from "@/lib/database/supabase-server";

export const metadata = { title: "Owner Dashboard — Sophisticated Sips" };
export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  if (!isSupabaseConfigured()) redirect("/owner/login?configuration=missing");
  if (!(await requireOwner())) redirect("/owner/transfer"); // signed-in non-owners: pending-transfer landing or a clear no-access page
  const db = supabaseAdmin();
  if (db) {
    try {
      await reconcileAmyFlyerCatalog(db);
    } catch (error) {
      console.error("catalog reconciliation:", error);
    }
  }
  return <OwnerDashboard />;
}
