"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * AppearancesEditor — Amy's public walk-up schedule (farmers markets, festivals,
 * pop-ups), separate from private catered bookings in the Pipeline. Kai reads
 * these live to answer "where will you be next," and the homepage banner does too.
 */

type Item = {
  id: string;
  location_name: string;
  address: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  active: boolean;
  sort: number;
};

const EF: (keyof Item)[] = ["location_name", "address", "event_date", "start_time", "end_time", "notes", "active", "sort"];
const sig = (it: Partial<Item>) => JSON.stringify(EF.map((k) => (it as any)[k] ?? ((it as any)[k] === false ? false : "")));
const blankNew = (): Omit<Item, "id"> => ({ location_name: "", address: "", event_date: "", start_time: "", end_time: "", notes: "", active: true, sort: 100 });

export default function AppearancesEditor() {
  const [items, setItems] = useState<Item[]>([]);
  const [saved, setSaved] = useState<Record<string, Item>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [nu, setNu] = useState<Omit<Item, "id">>(blankNew());

  const note = useCallback((m: string) => {
    setFlash(m);
    window.clearTimeout((note as any)._t);
    (note as any)._t = window.setTimeout(() => setFlash(""), 4500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/appearances", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { note(data.error || "Couldn't load appearances."); setLoading(false); return; }
      const list: Item[] = data.items || [];
      setItems(list);
      setSaved(Object.fromEntries(list.map((i) => [i.id, i])));
    } catch { note("Couldn't reach the server."); }
    setLoading(false);
  }, [note]);
  useEffect(() => { load(); }, [load]);

  const patch = (id: string, key: keyof Item, value: any) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [key]: value } : it)));

  const isDirty = (it: Item) => !saved[it.id] || sig(it) !== sig(saved[it.id]);

  const saveItem = async (it: Item) => {
    if (!it.location_name.trim() || !it.event_date) { note("Every appearance needs a location and a date."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/owner/appearances", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(it),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) { note(data.error || "Save failed."); return; }
      const returned: Item = data.item;
      setItems((cur) => cur.map((x) => (x.id === it.id ? returned : x)));
      setSaved((s) => ({ ...s, [returned.id]: returned }));
      note(`Saved “${returned.location_name}” — it's live on the site and Kai knows about it.`);
    } catch { setBusy(false); note("Save failed — check your connection."); }
  };

  const revertItem = (id: string) => {
    if (saved[id]) { setItems((cur) => cur.map((x) => (x.id === id ? saved[id] : x))); note("Reverted your unsaved changes."); }
  };

  const addItem = async () => {
    if (!nu.location_name.trim() || !nu.event_date) { note("Give the new appearance a location and a date."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/owner/appearances", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nu),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) { note(data.error || "Couldn't add the appearance."); return; }
      const it: Item = data.item;
      setItems((cur) => [...cur, it]);
      setSaved((s) => ({ ...s, [it.id]: it }));
      setNu(blankNew());
      note(`Added “${it.location_name}” to your schedule.`);
    } catch { setBusy(false); note("Couldn't add the appearance."); }
  };

  const del = async (it: Item) => {
    if (!window.confirm(`Delete “${it.location_name}” (${it.event_date})? This can't be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/owner/appearances?id=${encodeURIComponent(it.id)}`, { method: "DELETE" });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) { note(data.error || "Couldn't delete."); return; }
      setItems((cur) => cur.filter((x) => x.id !== it.id));
      setSaved((s) => { const c = { ...s }; delete c[it.id]; return c; });
      note(`Deleted “${it.location_name}”.`);
    } catch { setBusy(false); note("Couldn't delete."); }
  };

  const dirtyCount = items.filter(isDirty).length;
  const sorted = [...items].sort((a, b) => a.event_date.localeCompare(b.event_date) || a.sort - b.sort);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 1000 }}>
        <div className="morning">
          <div>
            <div className="sec-kicker">Public appearances</div>
            <h1 className="serif">Where you&apos;ll be</h1>
            <p style={{ fontSize: 14, opacity: .7, marginTop: 6 }}>
              Farmers markets, festivals, and pop-ups — separate from booked private events. Kai tells visitors
              about these live, and the soonest upcoming one shows on the homepage.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a className="mini-btn" href="/owner">← Dashboard</a>
          </div>
        </div>

        {flash && <div className="glass" style={{ padding: "12px 18px", marginBottom: 16, borderColor: "var(--gold)" }}>{flash}</div>}
        {dirtyCount > 0 && <div className="glass" style={{ padding: "10px 16px", marginBottom: 16, fontSize: 13.5 }}>You have <b style={{ color: "var(--gold-light)" }}>{dirtyCount}</b> item{dirtyCount === 1 ? "" : "s"} with unsaved changes — tap <b>Save</b> on each to publish.</div>}

        <div className="glass" style={{ marginBottom: 22 }}>
          <h3>Add an appearance</h3>
          <div className="fgrid" style={{ marginTop: 12 }}>
            <div className="field"><label htmlFor="nu-loc">Location name</label>
              <input id="nu-loc" value={nu.location_name} onChange={(e) => setNu({ ...nu, location_name: e.target.value })} placeholder="e.g. Winter Park Farmers Market" /></div>
            <div className="field"><label htmlFor="nu-date">Date</label>
              <input id="nu-date" type="date" value={nu.event_date} onChange={(e) => setNu({ ...nu, event_date: e.target.value })} /></div>
            <div className="field"><label htmlFor="nu-start">Start time</label>
              <input id="nu-start" value={nu.start_time ?? ""} onChange={(e) => setNu({ ...nu, start_time: e.target.value })} placeholder="e.g. 9:00 AM" /></div>
            <div className="field"><label htmlFor="nu-end">End time</label>
              <input id="nu-end" value={nu.end_time ?? ""} onChange={(e) => setNu({ ...nu, end_time: e.target.value })} placeholder="e.g. 1:00 PM" /></div>
          </div>
          <div className="field"><label htmlFor="nu-addr">Address (optional)</label>
            <input id="nu-addr" value={nu.address ?? ""} onChange={(e) => setNu({ ...nu, address: e.target.value })} placeholder="Street address or cross streets" /></div>
          <div className="field"><label htmlFor="nu-notes">Notes (optional)</label>
            <input id="nu-notes" value={nu.notes ?? ""} onChange={(e) => setNu({ ...nu, notes: e.target.value })} placeholder="e.g. Free parking, family-friendly" /></div>
          <button className="btn btn-gold" style={{ width: "100%", marginTop: 4 }} disabled={busy} onClick={addItem}>Add to schedule</button>
        </div>

        {loading && <div className="glass"><p>Loading your schedule…</p></div>}
        {!loading && items.length === 0 && <div className="glass"><p>No appearances yet — add your first above.</p></div>}

        <div className="grid" style={{ gap: 14 }}>
          {sorted.map((it) => {
            const dirty = isDirty(it);
            const past = it.event_date < today;
            return (
              <div key={it.id} className="glass" style={{ borderColor: dirty ? "var(--gold)" : undefined, opacity: past ? .6 : 1 }}>
                <div className="fgrid">
                  <div className="field"><label>Location name</label>
                    <input value={it.location_name} onChange={(e) => patch(it.id, "location_name", e.target.value)} /></div>
                  <div className="field"><label>Date</label>
                    <input type="date" value={it.event_date} onChange={(e) => patch(it.id, "event_date", e.target.value)} /></div>
                  <div className="field"><label>Start time</label>
                    <input value={it.start_time ?? ""} onChange={(e) => patch(it.id, "start_time", e.target.value)} /></div>
                  <div className="field"><label>End time</label>
                    <input value={it.end_time ?? ""} onChange={(e) => patch(it.id, "end_time", e.target.value)} /></div>
                </div>
                <div className="field"><label>Address</label>
                  <input value={it.address ?? ""} onChange={(e) => patch(it.id, "address", e.target.value)} /></div>
                <div className="field"><label>Notes</label>
                  <input value={it.notes ?? ""} onChange={(e) => patch(it.id, "notes", e.target.value)} /></div>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", margin: "2px 0 14px" }}>
                  <label className="chk"><input type="checkbox" checked={it.active} onChange={(e) => patch(it.id, "active", e.target.checked)} /> Show on site</label>
                  {past && <span className="badge b-ok">Past date</span>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button className="mini-btn gold" disabled={busy || !dirty} onClick={() => saveItem(it)}>{dirty ? "Save" : "Saved"}</button>
                  <button className="mini-btn" disabled={busy || !dirty} onClick={() => revertItem(it.id)}>Undo edits</button>
                  <button className="mini-btn" disabled={busy} onClick={() => del(it)} style={{ marginLeft: "auto" }}>Delete</button>
                  {!it.active && <span className="badge b-ok">Hidden</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
