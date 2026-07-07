/** Premium loading screen: a pouring cup with rising steam while routes stream in. */
export default function Loading() {
  return (
    <div style={{ minHeight: "60dvh", display: "grid", placeItems: "center" }} role="status" aria-label="Loading">
      <div style={{ textAlign: "center" }}>
        <div className="cup-stage" style={{ transform: "scale(.7)", margin: "0 auto" }} aria-hidden="true">
          <div className="steam" style={{ left: 62 }} />
          <div className="steam" style={{ left: 92, animationDelay: "1.1s" }} />
          <div className="steam" style={{ left: 120, animationDelay: "2.2s" }} />
          <div className="saucer" /><div className="cup" />
        </div>
        <p className="sec-kicker" style={{ marginTop: 8 }}>Brewing…</p>
      </div>
    </div>
  );
}
