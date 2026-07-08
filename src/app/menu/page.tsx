import { SecHead } from "@/components/public/Bits";
import MenuTabs from "@/components/public/MenuTabs";
import { supabaseServer } from "@/lib/database/supabase-server";
import { DEMO_MENU } from "@/lib/demo-data";

export const revalidate = 60;
export const metadata = { title: "Menu — Sophisticated Sips" };

export default async function MenuPage() {
  const sb = await supabaseServer();
  let items = DEMO_MENU as any[];
  if (sb) {
    const { data } = await sb.from("menu_items").select("*").eq("active", true).order("category").order("sort");
    if (data?.length) items = data;
  }
  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 780 }}>
        <SecHead kicker="The menu" title="Artisan drinks & desserts"
          sub="Everything is made to order at your event. Custom and seasonal menus available for catering." />
        <MenuTabs items={items || []} />
      </div>
    </div>
  );
}
