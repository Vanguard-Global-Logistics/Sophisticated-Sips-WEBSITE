"use client";
import { useState } from "react";

/** In-context help: What / How / Watch out. Tap ? to toggle. */
export default function Help({ what, how, watchOut }: { what: string; how: string; watchOut?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 8 }}>
      <button className="mini-btn" style={{ minHeight: 28, padding: "2px 10px", fontSize: 12, borderRadius: 12 }}
        aria-expanded={open} aria-label="Help" onClick={() => setOpen(!open)}>?</button>
      {open && (
        <span role="tooltip" style={{
          position: "absolute", zIndex: 30, top: "calc(100% + 8px)", left: 0,
          width: "min(300px, 78vw)", padding: "14px 16px", borderRadius: 14, fontSize: 13, lineHeight: 1.6,
          background: "#0D2C2B", border: "1px solid var(--gold)", boxShadow: "0 14px 34px rgba(0,0,0,.5)",
          display: "block", fontWeight: 400, textAlign: "left",
        }}>
          <b style={{ color: "var(--gold-light)" }}>What this is:</b> {what}<br />
          <b style={{ color: "var(--gold-light)" }}>How to use it:</b> {how}
          {watchOut && <><br /><b style={{ color: "#F0B5A0" }}>Watch out:</b> {watchOut}</>}
        </span>
      )}
    </span>
  );
}
