import Link from "next/link";
import { SecHead } from "@/components/public/Bits";

export const metadata = { title: "About — Sophisticated Sips" };

export default function About() {
  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <SecHead kicker="Our story" title="Family-owned. Florida-proud. Espresso-obsessed." />
        <div className="glass" style={{ padding: 34, fontSize: 15.5, lineHeight: 1.85, fontWeight: 300 }}>
          <p style={{ fontSize: 15.5, opacity: 0.88 }}>
            Sophisticated Sips began with a simple belief: the best moments at any event happen
            around great coffee. Owner <b style={{ color: "var(--gold-light)" }}>Amy Lavold</b> built
            the trailer to bring true café craftsmanship — real espresso, handmade crepes, artisan
            desserts — to the places Floridians actually gather: offices, schools, churches,
            weddings, and neighborhood celebrations.
          </p>
          <p style={{ fontSize: 15.5, opacity: 0.88, marginTop: 16 }}>
            Every event is served personally, styled beautifully, and priced honestly. When you book
            Sophisticated Sips, you&apos;re not hiring a vendor — you&apos;re inviting a local family business
            that treats your event like its own.
          </p>
          <div style={{ marginTop: 26, textAlign: "center" }}>
            <Link href="/book" className="btn btn-gold">Bring us to your event</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
