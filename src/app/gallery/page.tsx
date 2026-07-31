import fs from "fs";
import path from "path";
import Link from "next/link";

export const metadata = {
  title: "Gallery — Sophisticated Sips",
  description: "See the Sophisticated Sips mobile espresso trailer, handcrafted drinks, and luxury event presentation.",
};

const FRIENDLY_CAPTIONS: Record<string, string> = {
  "01-latte-art": "The art in every cup",
  "02-trailer-event": "The trailer in its element",
  "03-barista-pour": "Crafted in front of your guests",
  "04-bottle-display": "A beautifully styled flavor bar",
  "05-espresso-pour": "Espresso pulled fresh",
  "hero-trailer": "A complete mobile café experience",
  "signature-drinks": "Signature sips made to impress",
};

export default function Gallery() {
  const dir = path.join(process.cwd(), "public", "gallery");
  let photos: { src: string; caption: string }[] = [];
  try {
    photos = fs.readdirSync(dir)
      .filter((file: string) => /\.(jpe?g|png|webp|avif)$/i.test(file))
      .sort()
      .map((file: string) => {
        const key = file.replace(/\.[^.]+$/, "");
        return {
          src: `/gallery/${file}`,
          caption: FRIENDLY_CAPTIONS[key] || key.replace(/^\d+\s*-\s*/, "").replaceAll("-", " "),
        };
      });
  } catch {}

  return (
    <div className="lux-page">
      <header className="lux-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lux-hero__media" src="/gallery/03-barista-pour.jpg" alt="" style={{ objectPosition: "center 48%" }} />
        <div className="lux-hero__shade" />
        <div className="lux-hero__content">
          <p className="lux-kicker">A glimpse of our events</p>
          <h1>Beautifully<br />served</h1>
          <span className="lux-script">because every detail matters.</span>
          <p className="lux-lead">
            Real Sophisticated Sips photography—our drinks, our trailer, and the presentation
            Amy brings to every event.
          </p>
        </div>
      </header>

      <section className="lux-section lux-section--deep">
        <div className="wrap">
          <div className="lux-section__head">
            <p className="lux-kicker">The Sophisticated Sips experience</p>
            <h2 className="lux-title">Coffee worth photographing</h2>
            <div className="lux-gold-rule" aria-hidden="true">✦</div>
          </div>
          {photos.length ? (
            <div className="gallery-lux-grid">
              {photos.map((photo) => (
                <figure key={photo.src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src} alt={photo.caption} loading="lazy" decoding="async" />
                  <figcaption>{photo.caption}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="lux-copy" style={{ textAlign: "center" }}>Amy&apos;s event gallery is being prepared.</p>
          )}
          <div className="lux-actions" style={{ justifyContent: "center" }}>
            <Link href="/book" className="btn btn-lux btn-gold">Bring This Experience to My Event</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
