import Link from "next/link";

export function SecHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="sec-head reveal">
      <div className="sec-kicker">{kicker}</div>
      <h2 className="sec-title serif">{title}</h2>
      {sub && <p className="sec-sub">{sub}</p>}
    </div>
  );
}

export function Beans({ n = 8 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="bean" style={{
          left: `${8 + (i * 83) % 88}%`, top: `${10 + (i * 47) % 70}%`,
          animationDelay: `${(i * 0.9) % 5}s`, ["--s" as any]: `${0.7 + ((i * 13) % 6) / 10}`,
        }} />
      ))}
    </>
  );
}

export function CupHero() {
  return (
    <div className="cup-stage" aria-hidden="true">
      <div className="steam" style={{ left: 62 }} />
      <div className="steam" style={{ left: 92, animationDelay: "1.1s" }} />
      <div className="steam" style={{ left: 120, animationDelay: "2.2s" }} />
      <div className="saucer" /><div className="cup" />
    </div>
  );
}

export function PackageCards({ packages }: { packages: any[] }) {
  return (
    <div className="grid g3">
      {packages.map((p) => (
        <div key={p.id ?? p.name} className="glass" style={{ display: "flex", flexDirection: "column" }}>
          <div className="sec-kicker" style={{ fontSize: 10.5 }}>{p.tag}</div>
          <h3 className="serif" style={{ fontSize: 22 }}>{p.name}</h3>
          <p style={{ margin: "8px 0 14px" }}>{p.description}</p>
          <div style={{ flex: 1 }}>
            {(p.bullet_points || []).map((x: string) => (
              <div key={x} style={{ fontSize: 13.5, opacity: 0.8, padding: "5px 0" }}>
                <span style={{ color: "var(--gold)" }}>✦</span> {x}
              </div>
            ))}
          </div>
          <Link href="/book" className="btn btn-gold" style={{ marginTop: 18 }}>Get a quote</Link>
        </div>
      ))}
    </div>
  );
}
