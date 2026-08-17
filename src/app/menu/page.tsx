import Link from "next/link";
import BrandedMenu, { type BrandedMenuItem } from "@/components/public/BrandedMenu";
import { supabaseServer } from "@/lib/database/supabase-server";
import { DEMO_MENU } from "@/lib/demo-data";

export const revalidate = 60;
export const metadata = {
  title: "Menu — Sophisticated Sips",
  description: "Explore the current Sophisticated Sips mobile espresso bar menu, including Amy's signature drinks and event favorites.",
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
  // The owner-managed catalog is the source of truth. Running launch-data
  // migrations here would replace edits already made in the dashboard.
  return data?.length ? data : DEMO_MENU;
}

export default async function MenuPage() {
  const items = await activeMenu();

  return (
    <main className="menu-page">
      <div className="wrap menu-page__wrap">
        <header className="menu-page__intro">
          <div>
            <span className="sec-kicker">Amy&apos;s current menu</span>
            <h1 className="serif">Choose your perfect sip</h1>
            <p>Every active item below is available for Amy to include in your event experience.</p>
          </div>
          <div className="menu-page__actions">
            <Link className="btn btn-ghost" href="/menu/print">View printable flyer</Link>
            <Link className="btn btn-gold" href="/book">Book an event</Link>
          </div>
        </header>
        <BrandedMenu items={items} />
      </div>
    </main>
  );
}
