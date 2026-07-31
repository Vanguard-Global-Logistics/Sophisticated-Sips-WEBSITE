import Link from "next/link";
import { normalizeLegacyPackageRows } from "@/lib/catalog-guard";
import { supabaseServer } from "@/lib/database/supabase-server";
import { DEMO_PACKAGES } from "@/lib/demo-data";

export const revalidate = 300;
export const metadata = {
  title: "Coffee & Crepe Catering for Florida Events — Sophisticated Sips",
  description: "Explore Sophisticated Sips luxury espresso, crepe, wedding, corporate, and private-event catering experiences.",
};

type CateringPackage = {
  id?: string;
  name: string;
  tag?: string | null;
  description?: string | null;
  bullet_points?: string[] | null;
  base_price_cents?: number | null;
};

const PACKAGE_PHOTOS = [
  { src: "/gallery/signature-drinks.jpg", position: "center 46%" },
  { src: "/branding/catering/Catering-Luxury.jpeg", position: "center 46%" },
  { src: "/gallery/hero-trailer.jpg", position: "center 58%" },
];

export default async function Catering() {
  const sb = await supabaseServer();
  let packages = DEMO_PACKAGES as CateringPackage[];
  if (sb) {
    const { data } = await sb.from("catering_packages").select("*").eq("active", true).order("sort");
    if (data?.length) packages = normalizeLegacyPackageRows(data);
  }

  return (
    <div className="lux-page">
      <header className="lux-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="lux-hero__media"
          src="/branding/catering/Catering-Luxury.jpeg"
          alt="Sophisticated Sips espresso and crepe catering"
          style={{ objectPosition: "center 3%" }}
        />
        <div className="lux-hero__shade" />
        <div className="lux-hero__content">
          <p className="lux-kicker">Mobile espresso & crepe experience</p>
          <h1 className="lux-title-long">Make it<br />unforgettable</h1>
          <span className="lux-script">one handcrafted sip at a time.</span>
          <p className="lux-lead">
            Weddings, corporate events, baby showers, grand openings, and private celebrations—
            styled with the warmth of a European café and served personally by Amy&apos;s team.
          </p>
          <div className="lux-actions">
            <Link className="btn btn-lux btn-gold" href="/book">Reserve Your Experience</Link>
            <a className="btn btn-lux btn-ghost" href="/branding/catering/Catering-Luxury.jpeg" target="_blank" rel="noreferrer">
              View Full Catering Guide
            </a>
          </div>
        </div>
      </header>

      <section className="lux-section lux-section--deep">
        <div className="wrap catering-guide">
          <div className="catering-guide__copy">
            <p className="lux-kicker">Amy&apos;s catering guide</p>
            <h2>Choose your experience</h2>
            <span className="lux-script">crafted for the way you celebrate.</span>
            <p>
              This is the actual Sophisticated Sips catering presentation: espresso artistry,
              gourmet crepes, signature lattes, professional service, and a fully styled mobile bar.
            </p>
            <div className="lux-actions">
              <Link className="btn btn-lux btn-gold" href="/book">Request a Custom Quote</Link>
            </div>
          </div>
          <div className="lux-photo-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="catering-guide__image"
              src="/branding/catering/Catering-Luxury.jpeg"
              alt="Sophisticated Sips luxury catering packages, pricing, crepes, and signature drinks"
            />
          </div>
        </div>
      </section>

      <section className="lux-section lux-section--emerald">
        <div className="wrap">
          <div className="lux-section__head">
            <p className="lux-kicker">Current catering packages</p>
            <h2 className="lux-title">The Sophisticated Sips experience</h2>
            <div className="lux-gold-rule" aria-hidden="true">✦</div>
            <p>These package details come from Amy&apos;s current catering selections.</p>
          </div>
          <div className="experience-grid">
            {packages.map((pkg, index) => {
              const media = PACKAGE_PHOTOS[index % PACKAGE_PHOTOS.length];
              return (
                <article className="experience-card" key={pkg.id || pkg.name}>
                  <div className="experience-card__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={media.src} alt="" style={{ objectPosition: media.position }} />
                  </div>
                  <div className="experience-card__body">
                    <span className="experience-card__tag">{pkg.tag || "Sophisticated Sips catering"}</span>
                    <h3>{pkg.name}</h3>
                    {pkg.base_price_cents ? (
                      <strong style={{ color: "#e4bd68", fontFamily: "var(--font-serif)", fontSize: 18 }}>
                        Starting at ${(pkg.base_price_cents / 100).toLocaleString()}
                      </strong>
                    ) : null}
                    {pkg.description && <p style={{ marginTop: 9 }}>{pkg.description}</p>}
                    <ul>
                      {(pkg.bullet_points || []).map((point) => <li key={point}>{point}</li>)}
                    </ul>
                    <Link className="btn btn-lux btn-gold" href="/book">Build My Event</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lux-section lux-section--deep">
        <div className="wrap">
          <div className="lux-section__head">
            <p className="lux-kicker">Designed for the occasion</p>
            <h2 className="lux-title">Coffee, crepes & a beautiful experience</h2>
          </div>
          <div className="occasion-mosaic">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gallery/hero-trailer.jpg" alt="Sophisticated Sips mobile espresso trailer ready for an event" />
              <figcaption>Weddings & private celebrations</figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/branding/catering/Catering-Luxury.jpeg"
                alt="Fresh strawberry chocolate crepes"
                style={{ objectPosition: "center 54%" }}
              />
              <figcaption>Live gourmet crepes</figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gallery/signature-drinks.jpg" alt="Sophisticated Sips signature latte collection" />
              <figcaption>Corporate & grand openings</figcaption>
            </figure>
          </div>
        </div>
      </section>
    </div>
  );
}
