import Link from "next/link";
import { SecHead, PackageCards } from "@/components/public/Bits";
import { supabaseServer } from "@/lib/database/supabase-server";
import { DEMO_PACKAGES } from "@/lib/demo-data";

export const revalidate = 300;
export const metadata = { title: "Coffee Catering for Florida Events — Sophisticated Sips" };

export default async function Catering() {
  const sb = await supabaseServer();
  let packages = DEMO_PACKAGES as any[];
  if (sb) {
    const { data } = await sb.from("catering_packages").select("*").eq("active", true).order("sort");
    if (data?.length) packages = data;
  }
  return (
    <div className="section">
      <div className="wrap">
        <SecHead kicker="Coffee catering, done beautifully" title="Bring the best coffee break of the year to your event"
          sub="For businesses, planners, schools, and celebrations across Florida — Sophisticated Sips makes your event feel effortless, generous, and unforgettable." />
        <div className="grid g3" style={{ marginBottom: 54 }}>
          {[["🏢","Corporate coffee catering","Client events, conferences, and office pop-ups with invoice-friendly billing and branded menus."],
            ["💛","Employee appreciation days","The highest-ROI morale boost you can book. Watch the line form and the Slack messages roll in."],
            ["🎓","School events","Teacher weeks, fundraisers, and games — fast lines, fair pricing, kid-friendly non-espresso menu."],
            ["⛪","Church events","Fellowship hours, festivals, and volunteer appreciation, served with genuine warmth."],
            ["💍","Weddings","The Golden Event package: espresso bar, dessert display, and a crepe station your guests will talk about."],
            ["🎉","Private parties","Birthdays, showers, graduations — a luxury touch that makes hosting easy."],
            ["🏟️","Sporting events","Tournaments and meets with quick-serve menus for parents and fans."],
            ["🎄","Holiday parties","Peppermint Pulse season. Custom holiday menus for offices and neighborhoods."],
            ["🛍️","Vendor fairs & grand openings","Draw a crowd and keep them there. We're the booth people line up for."]]
            .map(([ic, h, p]) => (
              <div key={h} className="glass"><div className="icon">{ic}</div><h3>{h}</h3><p>{p}</p></div>
            ))}
        </div>
        <SecHead kicker="Packages" title="Choose your experience" />
        <PackageCards packages={packages || []} />
        <div className="glass" style={{ marginTop: 40, textAlign: "center", padding: "36px 24px" }}>
          <h3 className="serif" style={{ fontSize: 24 }}>Add-ons that steal the show</h3>
          <div style={{ margin: "16px 0 22px" }}>
            {["Luxury dessert display","Crepe station","Custom menu boards","Branded cup sleeves","Signature Golden Pulse bar","Holiday specials"].map((a) => (
              <span key={a} className="chip">{a}</span>
            ))}
          </div>
          <p className="sec-sub" style={{ marginBottom: 24 }}>
            Every event gets a custom quote within one business day. Tell us your date,
            your guest count, and your vision — Amy handles the rest.
          </p>
          <Link href="/book" className="btn btn-gold">Request My Catering Quote</Link>
        </div>
      </div>
    </div>
  );
}
