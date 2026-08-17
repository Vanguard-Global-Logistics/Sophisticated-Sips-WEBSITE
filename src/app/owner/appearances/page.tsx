import { redirect } from "next/navigation";
import { requireOwner, isSupabaseConfigured } from "@/lib/database/supabase-server";
import SetupNeeded from "@/components/admin/SetupNeeded";
import AppearancesEditor from "@/components/admin/AppearancesEditor";

export const metadata = { title: "Public Appearances — Sophisticated Sips" };
export const dynamic = "force-dynamic";

export default async function OwnerAppearancesPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded />;
  if (!(await requireOwner())) redirect("/owner");
  return <AppearancesEditor />;
}
