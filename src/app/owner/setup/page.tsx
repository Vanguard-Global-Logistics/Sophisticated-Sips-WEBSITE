import { redirect } from "next/navigation";
import { requireOwner, isSupabaseConfigured } from "@/lib/database/supabase-server";
import SetupWizard from "@/components/admin/SetupWizard";
import SetupNeeded from "@/components/admin/SetupNeeded";

export const metadata = { title: "Setup Wizard — Sophisticated Sips" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded />;
  if (!(await requireOwner())) redirect("/owner/login");
  return <SetupWizard />;
}
