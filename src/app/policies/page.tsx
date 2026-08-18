import {
  CANCELLATION_POLICY_EFFECTIVE_DATE,
  CANCELLATION_POLICY_FULL_TEXT,
  CANCELLATION_POLICY_TITLE,
  POLICY_VERSION,
} from "@/lib/policies/cancellation";

export const metadata = {
  title: "Cancellation and Refund Policy — Sophisticated Sips",
  description: "Sophisticated Sips cancellation, rescheduling, and refund policy for private event bookings.",
};

export default function PoliciesPage() {
  const sections = CANCELLATION_POLICY_FULL_TEXT.split("\n\n");

  return (
    <div className="lux-page">
      <section className="lux-section lux-section--deep" style={{ paddingTop: 120 }}>
        <div className="wrap" style={{ maxWidth: 920 }}>
          <p className="lux-kicker">Client terms</p>
          <h1 className="serif sec-title" style={{ marginBottom: 12 }}>{CANCELLATION_POLICY_TITLE}</h1>
          <p className="sec-sub" style={{ maxWidth: 760 }}>
            Effective {CANCELLATION_POLICY_EFFECTIVE_DATE}. Policy version {POLICY_VERSION}.
          </p>
          <article className="glass" style={{ padding: 30, marginTop: 26 }}>
            {sections.slice(2).map((section) => {
              const lines = section.split("\n");
              const [first, ...rest] = lines;
              const isNumberedHeading = /^\d+\.\s/.test(first);
              return (
                <section key={first} style={{ marginBottom: 24 }}>
                  {isNumberedHeading ? (
                    <h2 className="serif" style={{ color: "var(--gold)", fontSize: 24, margin: "0 0 10px" }}>{first}</h2>
                  ) : (
                    <p style={{ margin: "0 0 10px", fontWeight: 700 }}>{first}</p>
                  )}
                  {rest.join("\n").split("\n").map((line, index) => {
                    if (!line.trim()) return null;
                    if (line.startsWith("- ")) return <p key={index} style={{ margin: "6px 0 6px 18px" }}>{line}</p>;
                    if (line.startsWith('"')) return <blockquote key={index} style={{ margin: "12px 0", paddingLeft: 16, borderLeft: "3px solid var(--gold)", color: "var(--cream)" }}>{line}</blockquote>;
                    return <p key={index} style={{ margin: "0 0 10px", color: "rgba(246,239,227,.86)" }}>{line}</p>;
                  })}
                </section>
              );
            })}
          </article>
        </div>
      </section>
    </div>
  );
}
