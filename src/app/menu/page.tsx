import Link from "next/link";
import BrandedMenu, { type BrandedMenuItem } from "@/components/public/BrandedMenu";
import { supabaseServer } from "@/lib/database/supabase-server";
import { DEMO_MENU } from "@/lib/demo-data";

export const revalidate = 60;
export const metadata = {
  title: "Espresso, Iced Drinks & Crepes Menu | Sophisticated Sips",
  description: "Shaken espressos, lattes, macchiatos, dirty sodas and crepes from the Sophisticated Sips mobile cafe in New Port Richey. See the full event menu.",
  alternates: { canonical: "/menu" },
  openGraph: { title: "Espresso, Iced Drinks & Crepes Menu | Sophisticated Sips", description: "Shaken espressos, lattes, macchiatos, dirty sodas and crepes from the Sophisticated Sips mobile cafe in New Port Richey. See the full event menu.", url: "/menu", type: "website", siteName: "Sophisticated Sips" },
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

function menuJsonLd(items: BrandedMenuItem[], base: string) {
  const byCategory = new Map<string, BrandedMenuItem[]>();
  for (const item of items) {
    if (!byCategory.has(item.category)) byCategory.set(item.category, []);
    byCategory.get(item.category)!.push(item);
  }
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: "Sophisticated Sips Event Menu",
    url: `${base}/menu`,
    hasMenuSection: Array.from(byCategory.entries()).map(([category, sectionItems]) => ({
      "@type": "MenuSection",
      name: category,
      hasMenuItem: sectionItems.map((item) => ({
        "@type": "MenuItem",
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        offers: { "@type": "Offer", price: item.price_label, priceCurrency: "USD" },
      })),
    })),
  };
}

export default async function MenuPage() {
  const items = await activeMenu();
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sophisticatedsips.net").replace(/\/$/, "");
  const jsonLd = menuJsonLd(items, base);

  return (
    <main className="menu-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
