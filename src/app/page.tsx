import fs from "fs";
import path from "path";
import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/public/Reveal";
import KaiPublicStage from "@/components/ai/KaiPublicStage";
import { supabaseServer } from "@/lib/database/supabase-server";

export const revalidate = 300;

const has = (rel: string) => fs.existsSync(path.join(process.cwd(), "public", rel));

const GALLERY = [
  ["gallery/01-latte-art.jpg", "Latte art close-up"],
  ["gallery/02-trailer-event.jpg", "The trailer at an evening event"],
  ["gallery/03-barista-pour.jpg", "Barista pouring latte art"],
  ["gallery/04-bottle-display.jpg", "Bottled coffee display"],
  ["gallery/05-espresso-pour.jpg", "Espresso pouring close-up"],
] as const;

export default async function Home() {
  const sb = await supabaseServer();
  let settings: any = null;
  if (sb) {
    const { data } = await sb.from("business_settings").select("phone,service_area").eq("id", 1).maybeSingle();
    settings = data;
  }
  const heroImg = has("gallery/hero-trailer.jpg");
  const sigImg = has("gallery/signature-drinks.jpg");

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

      {/* 2 — Amy's actual trailer, with Kai stationed behind the counter */}
      <header className="trailer-hero">
        {heroImg && <div className="trailer-hero__backdrop" aria-hidden="true" />}
        <div className="trailer-hero__scene">
          {heroImg ? (
            <Image
              className="trailer-hero__image"
              src="/gallery/hero-trailer.jpg"
              alt="The real Sophisticated Sips mobile espresso trailer ready to serve at an evening event"
              fill
              priority
              sizes="(max-width: 820px) 100vw, 1147px"
            />
          ) : (
            <div className="trailer-hero__fallback" aria-hidden="true" />
          )}
          <div className="trailer-hero__shade" aria-hidden="true" />
          <KaiPublicStage />
        </div>

        <div className="trailer-hero__bar">
          <div className="trailer-hero__copy">
            <p className="kick">Premium coffee. Memorable experiences.</p>
            <h1>Elevate your event.</h1>
            <p>Luxury mobile espresso catering for weddings, corporate events, and celebrations across Florida.</p>
          </div>
          <div className="trailer-hero__actions">
            <Link href="/book" className="btn btn-lux btn-gold">Book an Event</Link>
            <Link href="/catering" className="btn btn-lux btn-ghost">View Packages</Link>
          </div>
        </div>
      </header>

      {/* 3 — photographic proof, matching Amy's luxury flyers */}
      <section className="home-proof" aria-label="The Sophisticated Sips experience">
        <div className="home-proof__grid">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery/05-espresso-pour.jpg" alt="Espresso pouring into a Sophisticated Sips cup" />
            <figcaption><b>Crafted with care</b><span>Fresh espresso and café-level presentation.</span></figcaption>
          </figure>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/catering/Catering-Luxury.jpeg"
              alt="A fresh strawberry and chocolate crepe"
              style={{ objectPosition: "center 54%" }}
            />
            <figcaption><b>Made fresh for guests</b><span>Decadent crepes prepared as part of the experience.</span></figcaption>
          </figure>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery/hero-trailer.jpg" alt="Sophisticated Sips mobile espresso trailer at an event" />
            <figcaption><b>Mobile & unforgettable</b><span>A complete luxury café brought directly to your event.</span></figcaption>
          </figure>
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
                <img src="/gallery/signature-drinks.jpg" alt="Four signature iced espresso drinks topped with whipped cream" />
              ) : (
                <div className="gal-fallback" style={{ aspectRatio: "3/2" }}>✦</div>
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
                    <div className="gal-fallback">✦</div>
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

      {/* 6 — final CTA */}
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
