import Link from "next/link";

export type BrandedMenuItem = {
  id?: string;
  category: string;
  name: string;
  price_label: string;
  description?: string | null;
  is_signature?: boolean;
  sold_out?: boolean;
  active?: boolean;
  sort?: number;
  photo_url?: string | null;
};

const CATEGORY_ORDER = ["Iced Espresso", "Hot Espresso", "Non-Espresso", "Signature"];

const CATEGORY_SUBTITLES: Record<string, string> = {
  "Iced Espresso": "Cold, smooth & made to order",
  "Hot Espresso": "Warm classics, pulled fresh",
  "Non-Espresso": "Refreshing favorites for every guest",
  Signature: "Amy's featured creations",
};

export default function BrandedMenu({
  items,
  variant = "public",
}: {
  items: BrandedMenuItem[];
  variant?: "public" | "preview" | "print";
}) {
  const available = items.filter((item) => item.active !== false);
  const categories = [...new Set(available.map((item) => item.category))]
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  return (
    <article className={`brand-menu brand-menu--${variant}`} aria-label="Sophisticated Sips menu">
      <div className="brand-menu__frame">
        <header className="brand-menu__header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="brand-menu__wordmark"
            src="/photos/sophisticated-sips-ornate-wordmark.svg"
            alt="Sophisticated Sips"
          />
          <p>Elevated flavor. Timeless indulgence.</p>
          <div className="brand-menu__flourish" aria-hidden="true"><span />✦<span /></div>
        </header>

        {categories.length ? (
          <div className="brand-menu__grid">
            {categories.map((category) => {
              const categoryItems = available
                .filter((item) => item.category === category)
                .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
              const headingId = `menu-category-${category.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

              return (
                <section
                  className={`brand-menu__category${category === "Signature" ? " brand-menu__category--signature" : ""}`}
                  key={category}
                  aria-labelledby={headingId}
                >
                  <div className="brand-menu__category-heading">
                    <h2 id={headingId}>{category}</h2>
                    <p>{CATEGORY_SUBTITLES[category] || "Curated especially for your event"}</p>
                  </div>

                  <div className="brand-menu__items">
                    {categoryItems.map((item) => (
                      <div
                        className={`brand-menu__item${item.sold_out ? " brand-menu__item--sold-out" : ""}`}
                        key={item.id || `${category}-${item.name}`}
                      >
                        {item.photo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="brand-menu__photo" src={item.photo_url} alt="" />
                        )}
                        <div className="brand-menu__item-copy">
                          <div className="brand-menu__item-line">
                            <h3>{item.name}{item.is_signature && <span aria-label="Signature item"> ✦</span>}</h3>
                            <span className="brand-menu__dots" aria-hidden="true" />
                            <strong>{item.price_label}</strong>
                          </div>
                          {item.description && <p>{item.description}</p>}
                          {item.sold_out && <span className="brand-menu__sold">Sold out today</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <p className="brand-menu__empty">Amy is preparing today&apos;s menu. Please check back shortly.</p>
        )}

        <footer className="brand-menu__footer">
          <div>
            <strong>Every sip is an experience.</strong>
            <span>Custom menus available for weddings, corporate events & private celebrations.</span>
            <Link href="/book">Book Sophisticated Sips</Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/qr/Order-QR.png" alt="Scan to book Sophisticated Sips" />
        </footer>
      </div>
    </article>
  );
}
