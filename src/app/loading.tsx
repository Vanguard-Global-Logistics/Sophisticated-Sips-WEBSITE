/** Brand loading screen while routes stream in. */
export default function Loading() {
  return (
    <div style={{ minHeight: "60dvh", display: "grid", placeItems: "center" }} role="status" aria-label="Loading">
      <div className="brand-loader">
        <div className="script">Sophisticated Sips</div>
        <div className="brand-loader-line" aria-hidden="true" />
        <p className="sec-kicker">Preparing your experience…</p>
      </div>
    </div>
  );
}
