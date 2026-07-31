import BrandedMenu, { type BrandedMenuItem } from "@/components/public/BrandedMenu";
import PrintButton from "@/components/public/PrintButton";
import { normalizeLegacyMenuRows } from "@/lib/catalog-guard";
import { supabaseServer } from "@/lib/database/supabase-server";
import { DEMO_MENU } from "@/lib/demo-data";

export const revalidate = 60;
export const metadata = {
  title: "Menu Flyer — Sophisticated Sips",
  robots: { index: false, follow: false },
};

async function activeMenu(): Promise<BrandedMenuItem[]> {
  const sb = await supabaseServer();
  if (!sb) return DEMO_MENU;
  const { data } = await sb
    .from("menu_items")
    .select("*")
    .eq("active", true)
    .order("category")
    .order("sort");
  return data?.length ? normalizeLegacyMenuRows(data) : DEMO_MENU;
}

export default async function MenuFlyer() {
  const items = await activeMenu();

  return (
    <main className="dynamic-menu-print">
      <h1 className="sr-only">Sophisticated Sips printable menu</h1>
      <PrintButton />
      <BrandedMenu items={items} variant="print" />
    </main>
  );
}
