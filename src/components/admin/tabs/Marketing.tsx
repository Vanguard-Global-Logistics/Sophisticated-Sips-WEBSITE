"use client";
import { useState } from "react";

const CHANNELS = [
  ["instagram", "📸 Instagram"], ["facebook", "👥 Facebook"], ["tiktok", "🎵 TikTok"],
  ["google_business", "📍 Google Business"], ["email_newsletter", "✉️ Newsletter"], ["campaign", "🎯 Campaign"],
] as const;

export default function Marketing() {
  const [channel, setChannel] = useState("instagram");
  const [theme, setTheme] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true); setOut("");
    try {
      const res = await fetch("/api/ai-marketing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, theme }),
      });
      const data = await res.json();
      setOut(data.reply || data.error || "Nothing came back — try again.");
    } catch { setOut("Couldn't reach the AI — try again."); }
    setBusy(false);
  };

  return (
    <div className="glass">
      <h3>AI Marketing Director</h3>
      <p style={{ margin: "8px 0 14px" }}>Drafts grounded in your real menu and recent demand. Copy, tweak, post — nothing publishes automatically.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {CHANNELS.map(([id, label]) => (
          <button key={id} className={`mtab ${channel === id ? "on" : ""}`} onClick={() => setChannel(id)}>{label}</button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="mk-theme">Theme (optional)</label>
        <input id="mk-theme" value={theme} onChange={(e) => setTheme(e.target.value)}
          placeholder="e.g. teacher appreciation week, Valentine's drinks, Christmas menu launch" />
      </div>
      <button className="btn btn-ai" onClick={generate} disabled={busy}>{busy ? "Writing…" : "✦ Write 3 drafts"}</button>
      {out && (
        <div style={{ marginTop: 16 }}>
          <p style={{ whiteSpace: "pre-wrap", fontSize: 14.5, lineHeight: 1.75 }}>{out}</p>
          <button className="mini-btn" style={{ marginTop: 12 }}
            onClick={() => navigator.clipboard?.writeText(out)}>Copy all</button>
        </div>
      )}
    </div>
  );
}
