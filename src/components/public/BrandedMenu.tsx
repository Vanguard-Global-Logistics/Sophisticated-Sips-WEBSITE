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

type CategoryArtwork =
  | { kind: "photo"; src: string; alt: string; position?: string }
  | { kind: "flyer-crop"; viewBox: string; alt: string };

const CATEGORY_ORDER = ["Iced Espresso", "Hot Espresso", "Non-Espresso", "Crepes", "Signature"];

const CATEGORY_SUBTITLES: Record<string, string> = {
  "Iced Espresso": "Cold, smooth & made to order",
  "Hot Espresso": "Warm classics, pulled fresh",
  "Non-Espresso": "Refreshing favorites for every guest",
  Crepes: "Decadent, handcrafted & made fresh",
  Signature: "Amy's featured creations",
};

const CATEGORY_ART: Record<string, CategoryArtwork> = {
  "Iced Espresso": {
    kind: "photo",
    src: "/gallery/signature-drinks.jpg",
    alt: "A collection of Sophisticated Sips iced specialty drinks",
    position: "center 46%",
  },
  "Hot Espresso": {
    kind: "photo",
    src: "/gallery/05-espresso-pour.jpg",
    alt: "Fresh espresso pouring into a Sophisticated Sips cup",
    position: "center 56%",
  },
  "Non-Espresso": {
    kind: "photo",
    src: "/gallery/04-bottle-display.jpg",
    alt: "Sophisticated Sips specialty syrups and event menu display",
    position: "center 52%",
  },
  Crepes: {
    kind: "flyer-crop",
    viewBox: "520 280 490 270",
    alt: "A strawberry, banana, chocolate and Nutella crepe from Amy's original menu",
  },
  Signature: {
    kind: "photo",
    src: "/gallery/01-latte-art.jpg",
    alt: "Sophisticated Sips signature latte art",
    position: "center 48%",
  },
};

const FALLBACK_ART: CategoryArtwork[] = [
  { kind: "photo", src: "/gallery/03-barista-pour.jpg", alt: "A handcrafted Sophisticated Sips latte" },
  { kind: "photo", src: "/gallery/02-trailer-event.jpg", alt: "Sophisticated Sips serving an event" },
  { kind: "photo", src: "/gallery/signature-drinks.jpg", alt: "Sophisticated Sips specialty drinks" },
];

function FlyerCrop({ viewBox, alt }: { viewBox: string; alt: string }) {
  return (
    <svg className="brand-menu__crop" viewBox={viewBox} role="img" aria-label={alt}>
      <image
        href="/branding/menu/Menu-Locked.png"
        width="1024"
        height="1536"
        preserveAspectRatio="xMidYMid slice"
      />
    </svg>
  );
}

function Artwork({ art }: { art: CategoryArtwork }) {
  if (art.kind === "flyer-crop") return <FlyerCrop viewBox={art.viewBox} alt={art.alt} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={art.src} alt={art.alt} style={{ objectPosition: art.position || "center" }} />
  );
}

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
    <article className={`brand-menu brand-menu--${variant}`} aria-label="Sophisticated Sips picture menu">
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

        <div className="brand-menu__showcase">
          <figure className="brand-menu__showcase-card brand-menu__showcase-card--espresso">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery/05-espresso-pour.jpg" alt="Fresh espresso being pulled" />
            <figcaption>Espresso artistry</figcaption>
          </figure>
          <figure className="brand-menu__showcase-card brand-menu__showcase-card--crepe">
            <FlyerCrop viewBox="520 280 490 270" alt="Amy's strawberry, banana, chocolate and Nutella crepe" />
            <figcaption>Decadent crepes</figcaption>
          </figure>
          <figure className="brand-menu__showcase-card brand-menu__showcase-card--iced">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery/signature-drinks.jpg" alt="Sophisticated Sips iced specialty drinks" />
            <figcaption>Signature sips</figcaption>
          </figure>
        </div>

        {categories.length ? (
          <div className="brand-menu__grid">
            {categories.map((category, categoryIndex) => {
              const categoryItems = available
                .filter((item) => item.category === category)
                .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
              const headingId = `menu-category-${category.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
              const art = CATEGORY_ART[category] || FALLBACK_ART[categoryIndex % FALLBACK_ART.length];

              return (
                <section
                  className={`brand-menu__category${category === "Signature" ? " brand-menu__category--signature" : ""}`}
                  key={category}
                  aria-labelledby={headingId}
                >
                  <div className="brand-menu__category-art">
                    <Artwork art={art} />
                    <div className="brand-menu__category-art-shade" />
                    <div className="brand-menu__category-art-label">
                      <span>{categoryItems.length} choice{categoryItems.length === 1 ? "" : "s"}</span>
                      <strong>{category}</strong>
                    </div>
                  </div>

                  <div className="brand-menu__category-content">
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
                            <img className="brand-menu__photo" src={item.photo_url} alt={`${item.name} menu item`} />
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
