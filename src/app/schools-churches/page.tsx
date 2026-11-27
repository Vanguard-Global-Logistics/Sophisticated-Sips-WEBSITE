import Link from "next/link";

const TITLE = "Coffee Catering for Schools and Churches | Sophisticated Sips";
const DESC =
  "Mobile espresso catering for school events, teacher appreciation days, fundraisers, and church gatherings across Tampa Bay. Real packages from $499. Request a quote.";

export const metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/schools-churches" },
  openGraph: { title: TITLE, description: DESC, url: "/schools-churches", type: "website", siteName: "Sophisticated Sips" },
};

const PACKAGES = [
  { name: "The Signature Bar", guests: "Up to 50 guests", price: "$499", note: "A professional espresso bar with unlimited handcrafted hot and iced drinks, premium syrups and milk choices, plus setup and breakdown." },
  { name: "The Paris Experience", guests: "Up to 100 guests", price: "$999", note: "Everything in The Signature Bar, plus a live gourmet crepe station made fresh for every guest." },
  { name: "The Grand Experience", guests: "Up to 200 guests", price: "$1,999", note: "The flagship: a luxury coffee cart, premium décor and floral accents, personalized drink names, and priority staffing." },
];

const FAQS = [
  {
    q: "What kinds of school and church events do you cater?",
    a: "Teacher and staff appreciation days, PTA and fundraiser events, back-to-school nights, awards ceremonies, and church gatherings like fellowship hours, women's or men's retreats, and volunteer appreciation events.",
  },
  {
    q: "Do you offer anything for fundraisers specifically?",
    a: "Tell us about your fundraiser when you book and we'll talk through options together — every event is quoted individually based on guest count and goals.",
  },
  {
    q: "What do you need from our school or church to set up?",
    a: "A space to park the trailer and reasonable access for setup and breakdown. Share your location details when you request a quote and we'll confirm everything works ahead of time.",
  },
];

export default function SchoolsAndChurches() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="lux-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="lux-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="lux-hero__media"
          src="/gallery/claywell-elementary-schools-churches.png"
          alt="The Sophisticated Sips mobile espresso trailer at Claywell Elementary School, with Amy Lavold waving from the service window"
          style={{ objectPosition: "15% 35%" }}
        />
        <div className="lux-hero__shade" />
        <div className="lux-hero__content">
          <p className="lux-kicker">Coffee catering for schools and churches</p>
          <h1>Real espresso<br />for your school or church event</h1>
          <span className="lux-script">the same bar, a familiar face.</span>
          <p className="lux-lead">
            A fully staffed espresso bar that comes to your campus or your church — real coffee,
            a friendly face, and one less thing to plan yourself.
          </p>
          <div className="lux-actions">
            <Link href="/book" className="btn btn-lux btn-gold">Request a Quote</Link>
            <Link href="/catering" className="btn btn-lux btn-ghost">View All Packages</Link>
          </div>
        </div>
      </header>

      <section className="lux-section lux-section--deep">
        <div className="wrap lux-copy" style={{ maxWidth: 820 }}>
          <p className="lux-kicker">A familiar face at local schools</p>
          <h2 className="lux-title" style={{ fontSize: "clamp(34px,5vw,54px)", margin: "10px 0 18px" }}>
            An approved Pasco County Schools vendor — and we&rsquo;d love to come to you
          </h2>
          <p>
            Sophisticated Sips is an approved vendor for Pasco County Schools, and we&rsquo;ve
            catered real events at Cypress Elementary, Trinity Elementary, and Zephyrhills High
            School, plus Claywell Elementary in Hillsborough County. We bring that same experience
            to schools and churches throughout Tampa Bay: teacher appreciation days, fundraisers,
            back-to-school nights, awards ceremonies, and church fellowship events. Forget the
            coffee pot that&rsquo;s been burning in the teacher&rsquo;s lounge since homeroom —
            this is a real espresso bar, made fresh in front of everyone.
          </p>
          <p>
            Setup and breakdown are handled for you, so your staff or volunteers get to actually
            enjoy the event instead of running a coffee station.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gallery/claywell-elementary-schools-churches.png"
            alt="Amy Lavold waving from the Sophisticated Sips trailer parked outside Claywell Elementary School"
            style={{ width: "100%", maxWidth: 480, borderRadius: 14, marginTop: 24, border: "1px solid rgba(201,164,92,.2)" }}
          />
        </div>
      </section>

      <section className="lux-section lux-section--emerald">
        <div className="wrap">
          <div className="lux-section__head">
            <p className="lux-kicker">Packages</p>
            <h2 className="lux-title">Choose your experience</h2>
            <div className="lux-gold-rule" aria-hidden="true">✦</div>
            <p>Starting prices. Your quote depends on your date, campus, and guest count.</p>
          </div>
          <div className="experience-grid">
            {PACKAGES.map((p) => (
              <article key={p.name} className="experience-card">
                <div className="experience-card__body">
                  <span className="experience-card__tag">{p.guests}</span>
                  <h3>{p.name}</h3>
                  <strong style={{ color: "#e4bd68", fontFamily: "var(--font-serif)", fontSize: 18 }}>Starting at {p.price}</strong>
                  <p style={{ marginTop: 9 }}>{p.note}</p>
                  <Link className="btn btn-lux btn-gold" href="/book">Request a Quote</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lux-section lux-section--deep">
        <div className="wrap lux-copy" style={{ maxWidth: 820 }}>
          <p className="lux-kicker">Questions</p>
          <h2 className="lux-title" style={{ fontSize: "clamp(30px,4vw,44px)", margin: "10px 0 18px" }}>
            Coffee catering for schools, answered
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 10 }}>
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 19, marginBottom: 6 }}>{f.q}</h3>
                <p>{f.a}</p>
              </div>
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
            Tell us your event date, school or church, and guest count and Amy will reply personally
            with a custom quote. Have questions first? See the{" "}
            <Link href="/faq" style={{ color: "#edcc83" }}>frequently asked questions</Link>.
          </p>
          <div className="lux-actions">
            <Link href="/book" className="btn btn-lux btn-gold">Request a Quote</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
