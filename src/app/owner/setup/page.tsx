import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/database/supabase-server";
import SetupWizard from "@/components/admin/SetupWizard";

export const metadata = { title: "Setup Wizard — Sophisticated Sips" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await requireOwner())) redirect("/owner/login");
  return <SetupWizard />;
}
