"use client";

/** Route-level error boundary — explains what happened and offers a way forward. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 520, textAlign: "center" }}>
        <div className="glass" style={{ padding: "48px 28px" }}>
          <div style={{ fontSize: 40 }}>☕</div>
          <h1 className="sec-title serif" style={{ margin: "12px 0" }}>That pour didn&apos;t land</h1>
          <p className="sec-sub" style={{ marginBottom: 24 }}>
            Something went wrong loading this page. Your booking and data are safe — try again.
          </p>
          <button className="btn btn-gold" onClick={reset}>Try again</button>
        </div>
      </div>
    </div>
  );
}
