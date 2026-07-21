import { redirect } from "next/navigation";
import { requireOwner, isSupabaseConfigured } from "@/lib/database/supabase-server";
import SetupNeeded from "@/components/admin/SetupNeeded";
import MenuEditor from "@/components/admin/MenuEditor";

export const metadata = { title: "Menu Editor — Sophisticated Sips" };
export const dynamic = "force-dynamic";

export default async function OwnerMenuPage() {
  if (!isSupabaseConfigured()) return <SetupNeeded />;
  if (!(await requireOwner())) redirect("/owner"); // /owner routes non-owners onward
  return <MenuEditor />;
}
