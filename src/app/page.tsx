import Link from "next/link";
import { SecHead, Beans, CupHero, PackageCards } from "@/components/public/Bits";
import Reveal from "@/components/public/Reveal";
import { supabaseServer } from "@/lib/database/supabase-server";

export const revalidate = 300;

const OCCASIONS = ["Corporate events","Schools","Weddings","Churches","Private parties","Staff appreciation","Vendor fairs","Holiday events","Real estate events","Grand openings","Sporting events","Chamber mixers"];

export default async function Home() {
  const sb = await supabaseServer();
  const [{ data: packages }, { data: signature }] = await Promise.all([
    sb.from("catering_packages").select("*").eq("active", true).order("sort"),
    sb.from("menu_items").select("*").eq("category", "Signature").eq("active", true).order("sort"),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
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
      <header className="hero">
        <Beans />
        <div className="wrap" style={{ position: "relative" }}>
          <div className="eyebrow reveal">Florida&apos;s luxury mobile espresso trailer</div>
          <h1 className="serif reveal" style={{ animationDelay: ".1s" }}>
            Sophisticated Sips<br /><span className="goldtxt">on the Go</span>
          </h1>
          <p className="reveal" style={{ animationDelay: ".2s" }}>
            Luxury mobile espresso, handcrafted drinks, crepes, and dessert catering
            for unforgettable Florida events.
          </p>
          <div className="cta-row reveal" style={{ animationDelay: ".3s" }}>
            <Link href="/book" className="btn btn-gold">Book the Trailer</Link>
            <Link href="/catering" className="btn btn-ghost">View Catering Packages</Link>
          </div>
          <CupHero />
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <SecHead kicker="The experience" title="A premium espresso bar, anywhere you gather"
            sub="A polished trailer, artisan drinks, and a warm crew — we bring the full café experience to your venue, and your guests remember it." />
          <Reveal><div className="grid g3">
            {[["☕","Handcrafted, every cup","Real espresso pulled fresh on site — no batch brew, no shortcuts. Iced, hot, and signature drinks made to order."],
              ["✨","Event-ready polish","The trailer arrives styled, staffed, and self-sufficient. Setup, service, and cleanup are all handled."],
              ["🤝","Family-owned & local","Owned by Amy Lavold, built on Florida hospitality. You'll always know exactly who's serving your guests."]]
              .map(([ic, h, p]) => (
                <div key={h} className="glass"><div className="icon">{ic}</div><h3>{h}</h3><p>{p}</p></div>
              ))}
          </div></Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <SecHead kicker="Occasions" title="Perfect for every kind of event" />
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
            {OCCASIONS.map((o) => <span key={o} className="chip">{o}</span>)}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <SecHead kicker="Featured" title="Signature drinks & desserts"
            sub="The Golden Pulse line is ours alone — you won't find it anywhere else in Florida." />
          <Reveal delay={80}><div className="grid g4">
            {(signature || []).map((m) => (
              <div key={m.id} className="glass" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 30 }}>{m.name.includes("Crepe") ? "🥞" : m.name.includes("Cheesecake") ? "🍰" : "☕"}</div>
                <h3 style={{ fontSize: 16 }}>{m.name}</h3>
                <div className="mi-price">{m.price_label}</div>
                <p style={{ marginTop: 6 }}>{m.description}</p>
              </div>
            ))}
          </div></Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 10 }}>
        <div className="wrap">
          <SecHead kicker="Packages" title="Catering packages" />
          <Reveal delay={80}><PackageCards packages={packages || []} /></Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ textAlign: "center" }}>
          <div className="glass" style={{ padding: "48px 28px", borderColor: "var(--gold)" }}>
            <div className="sec-kicker">AI-powered booking</div>
            <h2 className="sec-title serif">Plan your event in minutes,<br />not email chains</h2>
            <p className="sec-sub" style={{ marginBottom: 28 }}>
              Tap the glowing ✦ to build a menu and estimate pricing with our AI concierge —
              Amy reviews every request personally.
            </p>
            <div className="cta-row">
              <Link href="/book" className="btn btn-gold">Request My Catering Quote</Link>
              <Link href="/gallery" className="btn btn-ghost">See the trailer in action</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
