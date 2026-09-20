"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * EventLedger — what each trading day actually earned, and which markets to
 * chase next. Square only ever sees card payments; cash is about a quarter of
 * takings and market fees are invisible to it entirely, so this page is the
 * only place the real number lives. Owner-only.
 */

type Result = {
  id: string;
  appearance_id: string | null;
  venue_name: string;
  event_date: string;
  card_cents: number;
  cash_cents: number;
  gift_card_cents: number;
  fee_cents: number;
  tips_cents: number;
  drink_vendors: number | null;
  weather: string | null;
  notes: string | null;
  gross_cents: number;
  net_cents: number;
};

type Market = {
  id: string;
  market_name: string;
  organizer_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  location: string | null;
  next_date: string | null;
  application_deadline: string | null;
  fee_cents: number | null;
  expected_attendance: number | null;
  drink_exclusivity: boolean | null;
  status: string;
  priority: number;
  last_contact: string | null;
  next_action: string | null;
  notes: string | null;
};

const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const dollars = (c: number | null) => (c === null || c === undefined ? "" : String(c / 100));

const STATUSES = ["researching", "contacted", "applied", "accepted", "declined", "booked", "passed"];

const blankDay = () => ({
  venue_name: "", event_date: "", card: "", cash: "", fee: "", tips: "",
  drink_vendors: "", weather: "", notes: "",
});

export default function EventLedger() {
  const [results, setResults] = useState<Result[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [day, setDay] = useState(blankDay());
  const [newMarket, setNewMarket] = useState("");

  const note = useCallback((m: string) => {
    setFlash(m);
    window.clearTimeout((note as any)._t);
    (note as any)._t = window.setTimeout(() => setFlash(""), 5000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/owner/event-results", { cache: "no-store" }),
        fetch("/api/owner/event-pipeline", { cache: "no-store" }),
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (!r1.ok) note(d1.error || "Couldn't load your event takings.");
      else setResults(d1.items || []);
      if (!r2.ok) note(d2.error || "Couldn't load the market pipeline.");
      else setMarkets(d2.items || []);
    } catch { note("Couldn't reach the server."); }
    setLoading(false);
  }, [note]);
  useEffect(() => { load(); }, [load]);

  /** The league table: what each venue actually keeps per day, after fees. */
  const league = useMemo(() => {
    const by: Record<string, { days: number; gross: number; fees: number; net: number; tips: number }> = {};
    for (const r of results) {
      const v = (by[r.venue_name] ||= { days: 0, gross: 0, fees: 0, net: 0, tips: 0 });
      v.days += 1; v.gross += r.gross_cents; v.fees += r.fee_cents;
      v.net += r.net_cents; v.tips += r.tips_cents;
    }
    return Object.entries(by)
      .map(([venue, v]) => ({ venue, ...v, perDay: Math.round(v.net / v.days) }))
      .sort((a, b) => b.perDay - a.perDay);
  }, [results]);

  const totals = useMemo(() => {
    const t = { days: results.length, gross: 0, fees: 0, net: 0, cash: 0, tips: 0 };
    for (const r of results) {
      t.gross += r.gross_cents; t.fees += r.fee_cents;
      t.net += r.net_cents; t.cash += r.cash_cents; t.tips += r.tips_cents;
    }
    return t;
  }, [results]);

  const venueNames = useMemo(
    () => Array.from(new Set(results.map((r) => r.venue_name))).sort(),
    [results]
  );

  const addDay = async () => {
    if (!day.venue_name.trim() || !day.event_date) { note("A day needs a venue and a date."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/owner/event-results", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...day, gift_cards: 0 }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) { note(data.error || "Couldn't save that day."); return; }
      setResults((cur) => [data.item, ...cur].sort((a, b) => b.event_date.localeCompare(a.event_date)));
      note(`Saved ${data.item.venue_name} — you kept ${usd(data.item.net_cents)} that day.`);
      setDay(blankDay());
    } catch { setBusy(false); note("Couldn't save that day."); }
  };

  const delDay = async (r: Result) => {
    if (!window.confirm(`Delete ${r.venue_name} (${r.event_date})? This can't be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/owner/event-results?id=${encodeURIComponent(r.id)}`, { method: "DELETE" });
      setBusy(false);
      if (!res.ok) { note("Couldn't delete that day."); return; }
      setResults((cur) => cur.filter((x) => x.id !== r.id));
      note("Deleted.");
    } catch { setBusy(false); note("Couldn't delete that day."); }
  };

  const saveMarket = async (m: Partial<Market>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/owner/event-pipeline", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...m, fee: m.fee_cents === null || m.fee_cents === undefined ? "" : m.fee_cents / 100 }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) { note(data.error || "Couldn't save that market."); return; }
      setMarkets((cur) => {
        const without = cur.filter((x) => x.id !== data.item.id);
        return [...without, data.item].sort((a, b) => a.priority - b.priority);
      });
      note(`Saved “${data.item.market_name}”.`);
      setNewMarket("");
    } catch { setBusy(false); note("Couldn't save that market."); }
  };

  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 1000 }}>
        <div className="morning">
          <div>
            <div className="sec-kicker">Event ledger</div>
            <h1 className="serif">What each day actually earned</h1>
            <p style={{ fontSize: 14, opacity: .7, marginTop: 6 }}>
              Card comes from Square, but cash and market fees never do — so this is the only place the
              real number lives. Type the cash and the fee after each event and the rest works itself out.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a className="mini-btn" href="/owner">← Dashboard</a>
            <a className="mini-btn" href="/owner/appearances">Schedule</a>
          </div>
        </div>

        {flash && <div className="glass" style={{ padding: "12px 18px", marginBottom: 16, borderColor: "var(--gold)" }}>{flash}</div>}

        {!loading && results.length > 0 && (
          <div className="glass" style={{ marginBottom: 22 }}>
            <h3>Where the money actually comes from</h3>
            <p style={{ fontSize: 13.5, opacity: .75, marginTop: 4 }}>
              {totals.days} trading days · {usd(totals.gross)} taken · {usd(totals.fees)} paid in fees ·{" "}
              <b style={{ color: "var(--gold-light)" }}>{usd(totals.net)} kept</b>
              {totals.tips > 0 ? ` · ${usd(totals.tips)} tips` : ""}
            </p>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", opacity: .7 }}>
                    <th style={{ padding: "6px 8px" }}>Venue</th>
                    <th style={{ padding: "6px 8px" }}>Days</th>
                    <th style={{ padding: "6px 8px" }}>Taken</th>
                    <th style={{ padding: "6px 8px" }}>Fees</th>
                    <th style={{ padding: "6px 8px" }}>Kept</th>
                    <th style={{ padding: "6px 8px" }}>Per day</th>
                  </tr>
                </thead>
                <tbody>
                  {league.map((v) => (
                    <tr key={v.venue} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                      <td style={{ padding: "6px 8px" }}>{v.venue}</td>
                      <td style={{ padding: "6px 8px" }}>{v.days}</td>
                      <td style={{ padding: "6px 8px" }}>{usd(v.gross)}</td>
                      <td style={{ padding: "6px 8px", opacity: v.fees ? 1 : .4 }}>{usd(v.fees)}</td>
                      <td style={{ padding: "6px 8px" }}>{usd(v.net)}</td>
                      <td style={{ padding: "6px 8px", color: "var(--gold-light)", fontWeight: 600 }}>{usd(v.perDay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="glass" style={{ marginBottom: 22 }}>
          <h3>Record a day</h3>
          <div className="fgrid" style={{ marginTop: 12 }}>
            <div className="field"><label htmlFor="d-venue">Venue</label>
              <input id="d-venue" list="venue-names" value={day.venue_name}
                onChange={(e) => setDay({ ...day, venue_name: e.target.value })} placeholder="e.g. Starkey Wilderness Park" />
              <datalist id="venue-names">{venueNames.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
            <div className="field"><label htmlFor="d-date">Date</label>
              <input id="d-date" type="date" value={day.event_date} onChange={(e) => setDay({ ...day, event_date: e.target.value })} /></div>
            <div className="field"><label htmlFor="d-card">Card (Square)</label>
              <input id="d-card" type="number" inputMode="decimal" value={day.card} onChange={(e) => setDay({ ...day, card: e.target.value })} placeholder="410" /></div>
            <div className="field"><label htmlFor="d-cash">Cash</label>
              <input id="d-cash" type="number" inputMode="decimal" value={day.cash} onChange={(e) => setDay({ ...day, cash: e.target.value })} placeholder="106" /></div>
            <div className="field"><label htmlFor="d-fee">Event fee paid</label>
              <input id="d-fee" type="number" inputMode="decimal" value={day.fee} onChange={(e) => setDay({ ...day, fee: e.target.value })} placeholder="50" /></div>
            <div className="field"><label htmlFor="d-tips">Tips</label>
              <input id="d-tips" type="number" inputMode="decimal" value={day.tips} onChange={(e) => setDay({ ...day, tips: e.target.value })} placeholder="105" /></div>
            <div className="field"><label htmlFor="d-dv">Other drink vendors</label>
              <input id="d-dv" type="number" inputMode="numeric" value={day.drink_vendors} onChange={(e) => setDay({ ...day, drink_vendors: e.target.value })} placeholder="0" /></div>
            <div className="field"><label htmlFor="d-weather">Weather</label>
              <input id="d-weather" value={day.weather} onChange={(e) => setDay({ ...day, weather: e.target.value })} placeholder="hot / rainy / perfect" /></div>
          </div>
          <div className="field"><label htmlFor="d-notes">Notes</label>
            <input id="d-notes" value={day.notes} onChange={(e) => setDay({ ...day, notes: e.target.value })} placeholder="e.g. sold 17 crepes, quiet after 11" /></div>
          <button className="btn btn-gold" style={{ width: "100%", marginTop: 4 }} disabled={busy} onClick={addDay}>Save this day</button>
        </div>

        {loading && <div className="glass"><p>Loading…</p></div>}

        {!loading && (
          <div className="glass" style={{ marginBottom: 22 }}>
            <h3>Markets worth chasing</h3>
            <p style={{ fontSize: 13.5, opacity: .75, marginTop: 4 }}>
              Sophie fills this in as she researches. Compare any fee against what you keep per day above
              before saying yes.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <input value={newMarket} onChange={(e) => setNewMarket(e.target.value)} placeholder="Add a market by name" style={{ flex: "1 1 220px" }} />
              <button className="btn btn-gold" disabled={busy || !newMarket.trim()} onClick={() => saveMarket({ market_name: newMarket })}>Add</button>
            </div>
            {markets.length === 0 && <p style={{ marginTop: 12, opacity: .7 }}>Nothing in the pipeline yet.</p>}
            <div className="grid" style={{ gap: 10, marginTop: 14 }}>
              {markets.map((m) => (
                <div key={m.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <b>{m.market_name}</b>
                    <select value={m.status} onChange={(e) => saveMarket({ ...m, status: e.target.value })} style={{ maxWidth: 160 }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ fontSize: 13.5, opacity: .8, marginTop: 4 }}>
                    {m.location ? `${m.location} · ` : ""}
                    {m.next_date ? `next ${m.next_date} · ` : ""}
                    {m.fee_cents !== null ? `fee ${usd(m.fee_cents)} · ` : ""}
                    {m.expected_attendance ? `~${m.expected_attendance.toLocaleString()} people · ` : ""}
                    {m.drink_exclusivity === true ? "drink exclusivity ✓" : m.drink_exclusivity === false ? "shared drinks" : ""}
                  </div>
                  {m.next_action && <div style={{ fontSize: 13.5, marginTop: 4 }}>Next: {m.next_action}</div>}
                  {m.organizer_name && (
                    <div style={{ fontSize: 13, opacity: .7, marginTop: 2 }}>
                      {m.organizer_name}{m.contact_email ? ` · ${m.contact_email}` : ""}{m.contact_phone ? ` · ${m.contact_phone}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="glass">
            <h3>Every day, most recent first</h3>
            <div className="grid" style={{ gap: 10, marginTop: 12 }}>
              {results.map((r) => (
                <div key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <b>{r.venue_name}</b> <span style={{ opacity: .7 }}>{r.event_date}</span>
                    <div style={{ fontSize: 13, opacity: .75, marginTop: 2 }}>
                      card {usd(r.card_cents)} · cash {usd(r.cash_cents)}
                      {r.fee_cents ? ` · fee ${usd(r.fee_cents)}` : ""}
                      {r.tips_cents ? ` · tips ${usd(r.tips_cents)}` : ""}
                      {r.drink_vendors ? ` · ${r.drink_vendors} other drink vendors` : ""}
                      {r.weather ? ` · ${r.weather}` : ""}
                    </div>
                    {r.notes && <div style={{ fontSize: 13, opacity: .7, marginTop: 2 }}>{r.notes}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: r.net_cents < 0 ? "var(--caramel)" : "var(--gold-light)", fontWeight: 600 }}>{usd(r.net_cents)}</div>
                    <button className="mini-btn" disabled={busy} onClick={() => delDay(r)} style={{ marginTop: 4 }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
