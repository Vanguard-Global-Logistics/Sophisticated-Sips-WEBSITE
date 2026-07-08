import fs from "fs";
import path from "path";
import Link from "next/link";
import Reveal from "@/components/public/Reveal";
import { supabaseServer } from "@/lib/database/supabase-server";

export const revalidate = 300;

const has = (rel: string) => fs.existsSync(path.join(process.cwd(), "public", rel));

const FEATURES: [string, string, string][] = [
  ["cup", "Crafted with Care", "Barista-crafted beverages made with premium beans and high-quality ingredients."],
  ["leaf", "Mobile & Flexible", "Our sleek espresso bar comes to you, ready to impress your guests anywhere."],
  ["people", "Perfect for Any Event", "Weddings, corporate events, parties, and everything in between."],
  ["heart", "Experience That Lasts", "Exceptional service and unforgettable moments your guests will love."],
];

/* SAMPLE testimonials — replace with real client quotes before production launch.
   The staging banner covers the interim; do not go live with these. */
const TESTIMONIALS: [string, string][] = [
  ["Sophisticated Sips was the highlight of our wedding! The coffee was incredible and the service was top-notch.", "Jessica & Michael"],
  ["Professional, friendly, and unforgettable. Our corporate event guests are still talking about it!", "Amanda R."],
  ["The attention to detail is unmatched. Highly recommend for any special occasion.", "David L."],
];

const GALLERY = [
  ["gallery/01-latte-art.jpg", "Latte art close-up"],
  ["gallery/02-trailer-event.jpg", "The trailer at an evening event"],
  ["gallery/03-barista-pour.jpg", "Barista pouring latte art"],
  ["gallery/04-bottle-display.jpg", "Bottled coffee display"],
  ["gallery/05-espresso-pour.jpg", "Espresso pouring close-up"],
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    cup: (<><path d="M5 11h16v5a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-5z" /><path d="M21 12h2a3 3 0 0 1 0 6h-2M9 7c0-1.5 1-1.5 1-3M14 7c0-1.5 1-1.5 1-3" /></>),
    leaf: (<><path d="M6 26C6 14 14 6 27 6c0 13-8 21-21 20z" /><path d="M8 24C13 18 18 13 24 9" /></>),
    people: (<><circle cx="12" cy="10" r="4" /><path d="M4 26c0-4.4 3.6-8 8-8s8 3.6 8 8" /><circle cx="23" cy="12" r="3" /><path d="M22 18c3.3 0 6 2.7 6 6" /></>),
    heart: (<path d="M16 27S4 19.5 4 11.8C4 7.9 7 5 10.6 5c2.2 0 4.2 1.1 5.4 2.9C17.2 6.1 19.2 5 21.4 5 25 5 28 7.9 28 11.8 28 19.5 16 27 16 27z" />),
  };
  return <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">{paths[name]}</svg>;
}

export default async function Home() {
  const sb = await supabaseServer();
  let settings: any = null;
  if (sb) {
    const { data } = await sb.from("business_settings").select("phone,service_area").eq("id", 1).maybeSingle();
    settings = data;
  }
  const heroImg = has("hero-trailer.jpg");
  const sigImg = has("signature-drinks.jpg");

  const jsonLd = {
    "@context": "https://schema.org", "@type": "FoodEstablishment",
    name: "Sophisticated Sips",
    description: "Luxury mobile espresso, crepes, and dessert catering for Florida events.",
    servesCuisine: ["Coffee", "Espresso", "Crepes", "Desserts"],
    areaServed: "Florida, USA",
    founder: { "@type": "Person", name: "Amy Lavold" },
    url: process.env.NEXT_PUBLIC_SITE_URL,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 2 — cinematic hero */}
      <header className="hero2">
        <div className="hero2-bg" style={{
          backgroundImage: heroImg
            ? "url(/hero-trailer.jpg)"
            : "radial-gradient(800px 500px at 70% 45%, rgba(201,164,92,.28), transparent 65%), linear-gradient(150deg,#123B3A,#0A1D18 60%,#1a1108)",
        }} />
        <div className="hero2-shade" />
        <div className="hero2-in">
          <p className="kick">Premium coffee. Memorable experiences.</p>
          <h1>Elevate<br />Your Event</h1>
          <p className="sub">One sip at a time.</p>
          <p className="copy">
            Sophisticated Sips is a luxury mobile espresso bar bringing café-quality coffee and
            elevated service to weddings, corporate events, and private celebrations across Florida.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link href="/book" className="btn btn-lux btn-gold">Book an Event</Link>
            <Link href="/catering" className="btn btn-lux btn-ghost">View Packages</Link>
          </div>
        </div>
      </header>

      {/* 3 — feature strip */}
      <section className="strip" aria-label="Why Sophisticated Sips">
        <div className="wrap strip-grid">
          {FEATURES.map(([icon, title, copy]) => (
            <div className="feat" key={title}>
              <Icon name={icon} />
              <div><b>{title}</b><p>{copy}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — signature sips */}
      <section className="sig">
        <div className="wrap sig-grid">
          <Reveal>
            <div>
              <p className="sec-kicker" style={{ textAlign: "left" }}>Our Menu</p>
              <h2>Signature Sips</h2>
              <span className="script">made to impress</span>
              <p className="copy">
                From classic espresso drinks to creative signatures, our menu is designed to
                delight every guest.
              </p>
              <Link href="/menu" className="btn btn-lux btn-gold">View Full Menu</Link>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="sig-photo">
              {sigImg ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src="/signature-drinks.jpg" alt="Four signature iced espresso drinks topped with whipped cream" />
              ) : (
                <div className="gal-fallback" style={{ aspectRatio: "3/2" }}>☕</div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5 — event gallery */}
      <section className="gal">
        <div className="wrap">
          <p className="sec-kicker" style={{ textAlign: "center" }}>A Glimpse of Our Events</p>
          <Reveal>
            <div className="gal-grid">
              {GALLERY.map(([src, alt]) => (
                <div className="gal-item" key={src}>
                  {has(src) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={`/${src}`} alt={alt} loading="lazy" decoding="async" />
                  ) : (
                    <div className="gal-fallback">☕</div>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <Link href="/gallery" className="btn btn-lux btn-ghost">View Gallery</Link>
          </div>
        </div>
      </section>

      {/* 6 — testimonials */}
      <section className="testi">
        <div className="wrap">
          <p className="sec-kicker" style={{ textAlign: "center" }}>Kind Words</p>
          <h2>From Happy Clients</h2>
          <Reveal>
            <div className="testi-grid">
              {TESTIMONIALS.map(([quote, name]) => (
                <div className="quote" key={name}>
                  <div className="stars" aria-label="5 star review">★★★★★</div>
                  <p>&ldquo;{quote}&rdquo;</p>
                  <span>— {name}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7 — final CTA */}
      <section className="cta2">
        <div className="wrap cta2-grid">
          <div>
            <span className="script">Let&rsquo;s make your event</span>
            <h2>Unforgettable</h2>
          </div>
          <div className="mid">
            Our team is ready to bring the <b style={{ color: "var(--gold-light)" }}>Sophisticated Sips</b> experience
            to you.
            <div style={{ marginTop: 18 }}>
              <Link href="/book" className="btn btn-lux btn-gold">Book an Event</Link>
            </div>
          </div>
          <div className="contact-list">
            {settings?.phone && (
              <a href={`tel:${settings.phone}`}>
                <svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
                {settings.phone}
              </a>
            )}
            <span>
              <svg viewBox="0 0 24 24"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
              Serving {settings?.service_area || "Florida"} &amp; beyond
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
