"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * MenuEditor — Amy's manual, AI-independent menu control surface.
 * Every action is a direct call to /api/owner/menu (service-role behind an owner
 * gate). No Anthropic dependency: if AI is down, this still works completely.
 *
 * Throne OS: this is a generic catalog editor (name/price/category/order/photo/
 * availability) that could back any product list, not just coffee.
 */

type Item = {
  id: string;
  category: string;
  name: string;
  price_label: string;
  description: string | null;
  is_signature: boolean;
  sort: number;
  active: boolean;
  sold_out: boolean;
  photo_url: string | null;
};

const CATS = ["Iced Espresso", "Hot Espresso", "Non-Espresso", "Signature"];
const EF: (keyof Item)[] = ["category", "name", "price_label", "description", "is_signature", "sort", "active", "sold_out", "photo_url"];
const sig = (it: Partial<Item>) => JSON.stringify(EF.map((k) => (it as any)[k] ?? ((it as any)[k] === false ? false : "")));
const blankNew = (): Omit<Item, "id"> => ({ category: "Signature", name: "", price_label: "", description: "", is_signature: true, sort: 100, active: true, sold_out: false, photo_url: "" });

export default function MenuEditor() {
  const [items, setItems] = useState<Item[]>([]);
  const [saved, setSaved] = useState<Record<string, Item>>({});
  const [history, setHistory] = useState<Item[]>([]);
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
      const res = await fetch("/api/owner/menu", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { note(data.error || "Couldn't load the menu."); setLoading(false); return; }
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
    if (!it.name.trim() || !it.price_label.trim()) { note("Every item needs a name and a price."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/owner/menu", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(it),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) { note(data.error || "Save failed."); return; }
      const prev = saved[it.id];
      if (prev) setHistory((h) => [...h.slice(-9), prev]);
      const returned: Item = data.item;
      setItems((cur) => cur.map((x) => (x.id === it.id ? returned : x)));
      setSaved((s) => ({ ...s, [returned.id]: returned }));
      note(`Saved “${returned.name}” — it's live on the public menu.`);
    } catch { setBusy(false); note("Save failed — check your connection."); }
  };

  const revertItem = (id: string) => {
    if (saved[id]) { setItems((cur) => cur.map((x) => (x.id === id ? saved[id] : x))); note("Reverted your unsaved changes."); }
  };

  const addItem = async () => {
    if (!nu.name.trim() || !nu.price_label.trim()) { note("Give the new item a name and a price."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/owner/menu", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nu, is_signature: nu.is_signature || nu.category === "Signature" }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) { note(data.error || "Couldn't add the item."); return; }
      const it: Item = data.item;
      setItems((cur) => [...cur, it]);
      setSaved((s) => ({ ...s, [it.id]: it }));
      setNu(blankNew());
      note(`Added “${it.name}” to the menu.`);
    } catch { setBusy(false); note("Couldn't add the item."); }
  };

  const del = async (it: Item) => {
    if (!window.confirm(`Delete “${it.name}” from the menu? This can't be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/owner/menu?id=${encodeURIComponent(it.id)}`, { method: "DELETE" });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) { note(data.error || "Couldn't delete."); return; }
      setItems((cur) => cur.filter((x) => x.id !== it.id));
      setSaved((s) => { const c = { ...s }; delete c[it.id]; return c; });
      note(`Deleted “${it.name}”.`);
    } catch { setBusy(false); note("Couldn't delete."); }
  };

  const undoLast = async () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    await saveItem(prev);
    note(`Undid the last change to “${prev.name}”.`);
  };

  const dirtyCount = items.filter(isDirty).length;
  const byCat = useMemo(() => {
    const cats = [...new Set([...CATS, ...items.map((i) => i.category)])].filter((c) => items.some((i) => i.category === c));
    return cats.map((c) => ({ c, list: items.filter((i) => i.category === c).sort((a, b) => a.sort - b.sort) }));
  }, [items]);

  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 1000 }}>
        <div className="morning">
          <div>
            <div className="sec-kicker">Menu editor</div>
            <h1 className="serif">Your menu ✦</h1>
            <p style={{ fontSize: 14, opacity: .7, marginTop: 6 }}>
              Edit prices, descriptions, availability and order. Changes go live on the public menu the moment you save.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a className="mini-btn" href="/owner">← Dashboard</a>
            <a className="mini-btn" href="/menu" target="_blank" rel="noreferrer">👁 Preview public menu</a>
            <a className="mini-btn gold" href="/menu/print" target="_blank" rel="noreferrer">🖨 Print flyer</a>
            <button className="mini-btn" onClick={undoLast} disabled={busy || history.length === 0}>↩ Undo last change</button>
          </div>
        </div>

        {flash && <div className="glass" style={{ padding: "12px 18px", marginBottom: 16, borderColor: "var(--gold)" }}>{flash}</div>}
        {dirtyCount > 0 && <div className="glass" style={{ padding: "10px 16px", marginBottom: 16, fontSize: 13.5 }}>You have <b style={{ color: "var(--gold-light)" }}>{dirtyCount}</b> item{dirtyCount === 1 ? "" : "s"} with unsaved changes — tap <b>Save</b> on each to publish.</div>}

        {/* Add new */}
        <div className="glass" style={{ marginBottom: 22 }}>
          <h3>Add an item</h3>
          <div className="fgrid" style={{ marginTop: 12 }}>
            <div className="field"><label htmlFor="nu-name">Name</label>
              <input id="nu-name" value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} placeholder="e.g. Caramel Coast Cold Brew" /></div>
            <div className="field"><label htmlFor="nu-price">Price</label>
              <input id="nu-price" value={nu.price_label} onChange={(e) => setNu({ ...nu, price_label: e.target.value })} placeholder="e.g. 16 oz $6 · 24 oz $7" /></div>
            <div className="field"><label htmlFor="nu-cat">Category</label>
              <input id="nu-cat" list="cat-list" value={nu.category} onChange={(e) => setNu({ ...nu, category: e.target.value })} /></div>
            <div className="field"><label htmlFor="nu-sort">Display order</label>
              <input id="nu-sort" type="number" inputMode="numeric" value={nu.sort} onChange={(e) => setNu({ ...nu, sort: Number(e.target.value) })} /></div>
          </div>
          <div className="field"><label htmlFor="nu-desc">Description</label>
            <input id="nu-desc" value={nu.description ?? ""} onChange={(e) => setNu({ ...nu, description: e.target.value })} placeholder="One tasty sentence" /></div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", margin: "4px 0 14px" }}>
            <label className="chk"><input type="checkbox" checked={nu.is_signature} onChange={(e) => setNu({ ...nu, is_signature: e.target.checked })} /> Signature item</label>
          </div>
          <button className="btn btn-gold" style={{ width: "100%" }} disabled={busy} onClick={addItem}>Add to menu</button>
        </div>
        <datalist id="cat-list">{[...new Set([...CATS, ...items.map((i) => i.category)])].map((c) => <option key={c} value={c} />)}</datalist>

        {loading && <div className="glass"><p>Loading your menu…</p></div>}
        {!loading && items.length === 0 && <div className="glass"><p>No items yet — add your first above.</p></div>}

        {/* Editable rows grouped by category */}
        {byCat.map(({ c, list }) => (
          <div key={c} style={{ marginBottom: 26 }}>
            <h3 className="serif" style={{ fontSize: 20, margin: "6px 2px 12px", color: "var(--gold-light)" }}>{c}</h3>
            <div className="grid" style={{ gap: 14 }}>
              {list.map((it) => {
                const dirty = isDirty(it);
                return (
                  <div key={it.id} className="glass" style={{ borderColor: dirty ? "var(--gold)" : undefined }}>
                    <div className="fgrid">
                      <div className="field"><label>Name</label>
                        <input value={it.name} onChange={(e) => patch(it.id, "name", e.target.value)} /></div>
                      <div className="field"><label>Price</label>
                        <input value={it.price_label} onChange={(e) => patch(it.id, "price_label", e.target.value)} /></div>
                      <div className="field"><label>Category</label>
                        <input list="cat-list" value={it.category} onChange={(e) => patch(it.id, "category", e.target.value)} /></div>
                      <div className="field"><label>Display order</label>
                        <input type="number" inputMode="numeric" value={it.sort} onChange={(e) => patch(it.id, "sort", Number(e.target.value))} /></div>
                    </div>
                    <div className="field"><label>Description</label>
                      <textarea rows={2} value={it.description ?? ""} onChange={(e) => patch(it.id, "description", e.target.value)} /></div>
                    <div className="field"><label>Photo URL (optional)</label>
                      <input value={it.photo_url ?? ""} onChange={(e) => patch(it.id, "photo_url", e.target.value)} placeholder="https://… (leave blank if none)" /></div>
                    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", margin: "2px 0 14px" }}>
                      <label className="chk"><input type="checkbox" checked={it.active} onChange={(e) => patch(it.id, "active", e.target.checked)} /> Available</label>
                      <label className="chk"><input type="checkbox" checked={it.sold_out} onChange={(e) => patch(it.id, "sold_out", e.target.checked)} /> Sold out today</label>
                      <label className="chk"><input type="checkbox" checked={it.is_signature} onChange={(e) => patch(it.id, "is_signature", e.target.checked)} /> Signature</label>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button className="mini-btn gold" disabled={busy || !dirty} onClick={() => saveItem(it)}>{dirty ? "Save" : "Saved"}</button>
                      <button className="mini-btn" disabled={busy || !dirty} onClick={() => revertItem(it.id)}>Undo edits</button>
                      <button className="mini-btn" disabled={busy} onClick={() => del(it)} style={{ marginLeft: "auto" }}>Delete</button>
                      {!it.active && <span className="badge b-ok">Hidden</span>}
                      {it.sold_out && <span className="badge b-hot">Sold out</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Live preview */}
        {!loading && items.length > 0 && (
          <div className="glass" style={{ marginTop: 10 }}>
            <h3>Live preview <span style={{ fontSize: 12, opacity: .6, fontWeight: 400 }}>— how customers see it (available items only)</span></h3>
            <div style={{ marginTop: 10 }}>
              {byCat.map(({ c, list }) => {
                const shown = list.filter((i) => i.active);
                if (!shown.length) return null;
                return (
                  <div key={c} style={{ marginBottom: 14 }}>
                    <div className="sec-kicker" style={{ marginBottom: 6 }}>{c}</div>
                    {shown.map((m) => (
                      <div key={m.id} className="mi" style={{ opacity: m.sold_out ? .5 : 1 }}>
                        <div style={{ minWidth: 0 }}>
                          <div className="mi-name">{m.name}{m.is_signature && <span className="sig">Signature</span>}{m.sold_out && <span className="sig" style={{ color: "#F0B5A0", borderColor: "#F0B5A0" }}>Sold out</span>}</div>
                          {m.description && <div className="mi-desc">{m.description}</div>}
                        </div>
                        <div className="mi-dots" />
                        <div className="mi-price">{m.price_label}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
