import Link from "next/link";

export const metadata = {
  title: "About — Sophisticated Sips",
  description: "Meet Amy Lavold and the family-owned story behind Sophisticated Sips.",
};

export default function About() {
  return (
    <div className="lux-page">
      <header className="lux-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lux-hero__media" src="/gallery/hero-trailer.jpg" alt="" style={{ objectPosition: "center 54%" }} />
        <div className="lux-hero__shade" />
        <div className="lux-hero__content">
          <p className="lux-kicker">Family-owned by Amy Lavold</p>
          <h1>Made with<br />purpose</h1>
          <span className="lux-script">served with genuine care.</span>
          <p className="lux-lead">
            A Florida mobile café built around handcrafted drinks, beautiful presentation,
            and the belief that hospitality should feel personal.
          </p>
        </div>
      </header>

      <section className="lux-section lux-section--deep">
        <div className="wrap lux-split">
          <div className="lux-copy">
            <p className="lux-kicker">Our story</p>
            <h2 className="lux-title" style={{ fontSize: "clamp(38px,5vw,60px)", margin: "10px 0 18px" }}>
              More than a coffee bar
            </h2>
            <p>
              Sophisticated Sips began with a simple belief: the best moments at any event happen
              around great coffee. Owner <strong style={{ color: "#edcc83" }}>Amy Lavold</strong> built
              the trailer to bring true café craftsmanship—real espresso, handmade crepes, and
              signature drinks—to the places Floridians gather.
            </p>
            <p>
              Every event is served personally and styled intentionally. When you book Sophisticated
              Sips, you are inviting a local family business that treats your celebration with the
              same attention it would give its own.
            </p>
            <div className="lux-actions">
              <Link href="/book" className="btn btn-lux btn-gold">Bring Us to Your Event</Link>
              <Link href="/gallery" className="btn btn-lux btn-ghost">See the Experience</Link>
            </div>
          </div>
          <div className="lux-photo-frame" style={{ aspectRatio: "4 / 5" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery/signature-drinks.jpg" alt="Four handcrafted Sophisticated Sips signature drinks" />
          </div>
        </div>

        <div className="wrap">
          <div className="story-statements">
            <div className="story-statement">
              <strong>Handcrafted</strong>
              <span>Espresso, signature drinks, and crepes prepared with care.</span>
            </div>
            <div className="story-statement">
              <strong>Beautifully styled</strong>
              <span>A polished café presentation designed to belong at your event.</span>
            </div>
            <div className="story-statement">
              <strong>Personally served</strong>
              <span>Clear planning and warm hospitality directly from Amy&apos;s team.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
