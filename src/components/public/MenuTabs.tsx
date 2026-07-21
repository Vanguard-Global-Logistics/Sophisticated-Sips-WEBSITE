"use client";
import { useState } from "react";

type Item = { id: string; category: string; name: string; price_label: string; description: string | null; is_signature: boolean; sold_out?: boolean };

export default function MenuTabs({ items }: { items: Item[] }) {
  const cats = [...new Set(items.map((i) => i.category))];
  const [cat, setCat] = useState(cats[0] ?? "");
  return (
    <>
      <div className="menu-tabs" role="tablist" aria-label="Menu categories">
        {cats.map((c) => (
          <button key={c} role="tab" aria-selected={c === cat}
            className={`mtab ${c === cat ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="glass" style={{ padding: "10px 22px 18px" }} role="tabpanel" aria-label={cat}>
        {items.filter((m) => m.category === cat).map((m) => (
          <div key={m.id} className="mi" style={{ opacity: m.sold_out ? 0.5 : 1 }}>
            <div style={{ minWidth: 0 }}>
              <div className="mi-name">{m.name}{m.is_signature && <span className="sig">Signature</span>}{m.sold_out && <span className="sig" style={{ color: "#E7A98F", borderColor: "#E7A98F" }}>Sold out</span>}</div>
              {m.description && <div className="mi-desc">{m.description}</div>}
            </div>
            <div className="mi-dots" />
            <div className="mi-price">{m.price_label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
