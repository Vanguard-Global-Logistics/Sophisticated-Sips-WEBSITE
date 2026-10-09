import Link from "next/link";

const TITLE = "Mobile Espresso Trailer FAQ | Sophisticated Sips";
const DESC =
  "Answers about booking Sophisticated Sips: how far we travel, what a package includes, pricing, and the events we serve across Pasco and Tampa Bay.";

export const metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/faq" },
  openGraph: { title: TITLE, description: DESC, url: "/faq", type: "website", siteName: "Sophisticated Sips" },
};

const FAQS = [
  {
    q: "How far does Sophisticated Sips travel?",
    a: "We are based in New Port Richey and serve Pasco, Hillsborough, Pinellas, and Hernando counties, roughly a 50-mile radius.",
  },
  {
    q: "How do I book the espresso trailer?",
    a: "Send the booking form with your date, location, and guest count. Amy replies personally with a custom quote.",
  },
  {
    q: "How much does it cost?",
    a: "Packages start at $499 for up to 50 guests, $999 for up to 100 guests with a live crepe station, and $1,999 for up to 200 guests with the full luxury experience. Your quote depends on your date, location, and guest count.",
  },
  {
    q: "What is included in a package?",
    a: "Fresh espresso, hot and iced drinks, premium syrups and milk choices, plus setup and breakdown. The Paris Experience adds a live gourmet crepe station, and The Grand Experience adds a luxury coffee cart, premium décor, personalized drink names, and priority staffing.",
  },
  {
    q: "What kinds of events do you serve?",
    a: "Weddings, corporate events, schools, churches, baby showers, grand openings, and private celebrations.",
  },
];

export default function FAQ() {
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
        <img className="lux-hero__media" src="/gallery/hero-trailer.jpg" alt="" style={{ objectPosition: "center 54%" }} />
        <div className="lux-hero__shade" />
        <div className="lux-hero__content">
          <p className="lux-kicker">Good questions</p>
          <h1>Frequently asked<br />questions</h1>
          <span className="lux-script">everything before you book.</span>
        </div>
      </header>

      <section className="lux-section lux-section--deep">
        <div className="wrap lux-copy" style={{ maxWidth: 820 }}>
          {FAQS.map((f) => (
            <div key={f.q} style={{ marginBottom: 28 }}>
              <h2 style={{ color: "#edcc83", fontSize: 24, margin: "0 0 8px" }}>{f.q}</h2>
              <p>{f.a}</p>
            </div>
          ))}
          <div className="lux-actions">
            <Link href="/book" className="btn btn-lux btn-gold">Request a Quote</Link>
            <Link href="/weddings" className="btn btn-lux btn-ghost">Wedding Espresso Bars</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
