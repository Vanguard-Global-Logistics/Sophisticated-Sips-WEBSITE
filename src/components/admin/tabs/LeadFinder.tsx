"use client";
import { useState } from "react";
import Help from "@/components/admin/Help";

export default function LeadFinder({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const extract = async () => {
    setBusy(true); setErr(""); setResult(null);
    try {
      const res = await fetch("/api/ai-secretary/extract-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); } else { setResult(data); setText(""); onSaved(); }
    } catch { setErr("Couldn't reach the AI — try again."); }
    setBusy(false);
  };

  return (
    <div className="glass">
      <h3>Lead Finder — public sources only
        <Help what="Turns a public event announcement you found into a scored lead in your pipeline."
          how="Copy the announcement text (chamber calendar, school newsletter, venue vendor call) and paste it here."
          watchOut="Only use genuinely public listings, and only contact emails printed in them. Approval and opt-out rules still apply." /></h3>
      <p style={{ margin: "8px 0 6px" }}>
        Found a public event announcement? Chamber calendars, city event pages, school newsletters, venue vendor calls,
        festival applications — paste the text and the AI turns it into a scored lead in your pipeline.
      </p>
      <p style={{ fontSize: 12.5, opacity: .6, marginBottom: 14 }}>
        By design there's no automated scraping: you find it, the AI structures it, and every outreach email still needs your approval.
      </p>
      <div className="field">
        <label htmlFor="lf-text">Announcement text</label>
        <textarea id="lf-text" rows={6} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Paste the public announcement here — the more of it, the better the extraction…" />
      </div>
      {err && <div className="form-error" role="alert">{err}</div>}
      <button className="btn btn-ai" onClick={extract} disabled={busy || text.trim().length < 30}>
        {busy ? "Extracting…" : "✦ Extract lead"}
      </button>
      {result && (
        <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.7 }}>
          <b style={{ color: "var(--gold-light)" }}>{result.extracted.name}</b> · {result.extracted.event_type}
          {result.extracted.event_date ? ` · ${result.extracted.event_date}` : ""}
          {result.extracted.guest_estimate ? ` · ~${result.extracted.guest_estimate} guests` : ""}
          <p style={{ opacity: .8, marginTop: 6 }}>{result.extracted.summary}</p>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--gold-light)" }}>{result.nextStep}</p>
        </div>
      )}
    </div>
  );
}
