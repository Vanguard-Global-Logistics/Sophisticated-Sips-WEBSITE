import Link from "next/link";

const TITLE = "Mobile Coffee Trailer in New Port Richey, FL";
const DESC =
  "Hire the New Port Richey mobile coffee trailer for parties, offices, schools and church events. Local and family-owned.";

export const metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/locations/new-port-richey" },
  openGraph: { title: TITLE, description: DESC, url: "/locations/new-port-richey", type: "website", siteName: "Sophisticated Sips" },
};

const GOOD_FOR = [
  "School and teacher appreciation events",
  "Church and community gatherings",
  "Office mornings and team celebrations",
  "Birthday parties and baby showers",
  "Grand openings",
  "Weddings",
];

export default function NewPortRichey() {
  return (
    <div className="lux-page">
      <header className="lux-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lux-hero__media" src="/gallery/02-trailer-event.jpg" alt="The Sophisticated Sips coffee trailer at an evening event in Pasco County" style={{ objectPosition: "center 54%" }} />
        <div className="lux-hero__shade" />
        <div className="lux-hero__content">
          <p className="lux-kicker">Family-owned in Pasco County</p>
          <h1>Mobile coffee trailer<br />in New Port Richey</h1>
          <span className="lux-script">real espresso, right at your event.</span>
          <p className="lux-lead">
            Sophisticated Sips is a family-owned mobile espresso and crepe trailer based in New Port
            Richey, serving parties, schools, churches, offices, and weddings across Pasco County.
          </p>
          <div className="lux-actions">
            <Link href="/book" className="btn btn-lux btn-gold">Request a Quote</Link>
            <Link href="/menu" className="btn btn-lux btn-ghost">See the Menu</Link>
          </div>
        </div>
      </header>

      <section className="lux-section lux-section--deep">
        <div className="wrap lux-split">
          <div className="lux-copy">
            <p className="lux-kicker">Local, personal, handcrafted</p>
            <h2 className="lux-title" style={{ fontSize: "clamp(34px,5vw,54px)", margin: "10px 0 18px" }}>
              A real espresso bar, brought to you
            </h2>
            <p>
              We bring a professional barista, fresh espresso, signature drinks, and handmade crepes
              straight to your event. Setup and breakdown are handled for you, and every drink is
              made fresh for your guests.
            </p>
            <h3 style={{ color: "#edcc83", marginTop: 24 }}>Great for</h3>
            <ul>
              {GOOD_FOR.map((g) => (<li key={g}>{g}</li>))}
            </ul>
            <p>
              Also serving Trinity, Odessa, Land O&apos; Lakes, Lutz, Wesley Chapel, Spring Hill,
              Brooksville, Tampa, Clearwater, and St. Petersburg.
            </p>
            <div className="lux-actions">
              <Link href="/book" className="btn btn-lux btn-gold">Request a Quote</Link>
              <Link href="/faq" className="btn btn-lux btn-ghost">Read the FAQ</Link>
            </div>
          </div>
          <div className="lux-photo-frame" style={{ aspectRatio: "4 / 5" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery/signature-drinks.jpg" alt="Four signature iced espresso drinks from Sophisticated Sips" />
          </div>
        </div>
      </section>
    </div>
  );
}
