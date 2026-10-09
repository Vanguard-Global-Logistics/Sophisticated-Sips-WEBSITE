import Link from "next/link";

const TITLE = "Mobile Espresso Bar for Weddings | Tampa Bay";
const DESC =
  "Give wedding guests a handcrafted espresso bar with a professional barista. Serving Tampa, Clearwater, St. Petersburg, Wesley Chapel and New Port Richey. Check your date.";

export const metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/weddings" },
  openGraph: { title: TITLE, description: DESC, url: "/weddings", type: "website", siteName: "Sophisticated Sips" },
};

const PACKAGES = [
  { name: "The Signature Bar", guests: "Up to 50 guests", price: "$499", note: "A professional espresso bar with unlimited handcrafted hot and iced drinks, premium syrups and milk choices, plus setup and breakdown." },
  { name: "The Paris Experience", guests: "Up to 100 guests", price: "$999", note: "Everything in The Signature Bar, plus a live gourmet crepe station made fresh for every guest." },
  { name: "The Grand Experience", guests: "Up to 200 guests", price: "$1,999", note: "The flagship: a luxury coffee cart, premium décor and floral accents, personalized drink names, and priority staffing." },
];

export default function Weddings() {
  return (
    <div className="lux-page">
      <header className="lux-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lux-hero__media" src="/gallery/hero-trailer.jpg" alt="The Sophisticated Sips mobile espresso trailer set up for an evening event" style={{ objectPosition: "center 54%" }} />
        <div className="lux-hero__shade" />
        <div className="lux-hero__content">
          <p className="lux-kicker">Weddings across Tampa Bay</p>
          <h1>A mobile espresso bar<br />for your wedding</h1>
          <span className="lux-script">coffee, crepes, and a little wow.</span>
          <p className="lux-lead">
            A styled, fully staffed espresso and crepe bar that comes to your venue, so great coffee
            becomes part of the celebration instead of a line at the back of the room.
          </p>
          <div className="lux-actions">
            <Link href="/book" className="btn btn-lux btn-gold">Check Your Date</Link>
            <Link href="/catering" className="btn btn-lux btn-ghost">View All Packages</Link>
          </div>
        </div>
      </header>

      <section className="lux-section lux-section--deep">
        <div className="wrap lux-copy" style={{ maxWidth: 820 }}>
          <p className="lux-kicker">Why couples choose us</p>
          <h2 className="lux-title" style={{ fontSize: "clamp(34px,5vw,54px)", margin: "10px 0 18px" }}>
            Your guests will remember the toast. And the latte.
          </h2>
          <p>
            Sophisticated Sips brings a professional barista and a beautifully presented espresso bar
            to your venue anywhere across Pasco, Hillsborough, and Pinellas counties. Guests order
            what they love, hot or iced, and every drink is made fresh while the party carries on.
          </p>
          <p>
            Setup and breakdown are handled for you. Add a live crepe station and the bar becomes a
            dessert moment your guests will talk about long after the cake is gone.
          </p>
        </div>
      </section>

      <section className="lux-section lux-section--emerald">
        <div className="wrap">
          <div className="lux-section__head">
            <p className="lux-kicker">Packages</p>
            <h2 className="lux-title">Choose your experience</h2>
            <div className="lux-gold-rule" aria-hidden="true">✦</div>
            <p>Starting prices. Your quote depends on your date, venue, and guest count.</p>
          </div>
          <div className="experience-grid">
            {PACKAGES.map((p) => (
              <article key={p.name} className="experience-card">
                <div className="experience-card__body">
                  <span className="experience-card__tag">{p.guests}</span>
                  <h3>{p.name}</h3>
                  <strong style={{ color: "#e4bd68", fontFamily: "var(--font-serif)", fontSize: 18 }}>Starting at {p.price}</strong>
                  <p style={{ marginTop: 9 }}>{p.note}</p>
                  <Link className="btn btn-lux btn-gold" href="/book">Check Your Date</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lux-section lux-section--deep">
        <div className="wrap lux-copy" style={{ maxWidth: 820 }}>
          <p className="lux-kicker">Where we serve</p>
          <h2 className="lux-title" style={{ fontSize: "clamp(30px,4vw,44px)", margin: "10px 0 18px" }}>
            Based in New Port Richey, serving all of Tampa Bay
          </h2>
          <p>
            New Port Richey, Trinity, Odessa, Land O&apos; Lakes, Lutz, Wesley Chapel, Spring Hill,
            Brooksville, Tampa, Clearwater, and St. Petersburg.
          </p>
          <p>
            Tell us your date, venue, and guest count and Amy will reply personally with a custom quote.
            Have questions first? See the <Link href="/faq" style={{ color: "#edcc83" }}>frequently asked questions</Link>.
          </p>
          <div className="lux-actions">
            <Link href="/book" className="btn btn-lux btn-gold">Request a Quote</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
