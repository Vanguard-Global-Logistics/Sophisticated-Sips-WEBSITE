import Link from "next/link";

export default function NotFound() {
  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 520, textAlign: "center" }}>
        <div className="glass" style={{ padding: "48px 28px" }}>
          <div className="sec-kicker">404</div>
          <h1 className="sec-title serif" style={{ margin: "12px 0" }}>This page wandered off</h1>
          <p className="sec-sub" style={{ marginBottom: 24 }}>The good stuff is still here — the menu, the trailer, and your quote.</p>
          <Link href="/" className="btn btn-gold">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
