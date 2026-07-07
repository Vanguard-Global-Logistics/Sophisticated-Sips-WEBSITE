"use client";

const usd = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/** Business intelligence computed entirely from Amy's real data — no invented numbers. */
export default function Insights({ leads, events, payments }: { leads: any[]; events: any[]; payments: any[] }) {
  const paid = payments.filter((p) => p.status === "paid" && p.paid_at);
  const revenue = paid.reduce((s, p) => s + p.amount_cents, 0);

  // Last 6 calendar months revenue series
  const months: { label: string; cents: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    months.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      cents: paid.filter((p) => String(p.paid_at).startsWith(key)).reduce((s, p) => s + p.amount_cents, 0),
    });
  }
  const max = Math.max(1, ...months.map((m) => m.cents));

  const total = leads.length;
  const confirmed = leads.filter((l) => l.status === "confirmed").length;
  const conversion = total ? Math.round((confirmed / total) * 100) : 0;
  const avgBooking = events.length
    ? Math.round(events.reduce((s, e) => s + (e.quote_total_cents || 0), 0) / events.length) : 0;

  const bySource = count(leads, (l) => l.source || "website");
  const byType = count(leads, (l) => l.event_type || "Other");
  const repeatEmails = Object.entries(count(leads.filter((l) => l.contact_email), (l) => l.contact_email))
    .filter(([, n]) => (n as number) >= 2).length;

  return (
    <div className="grid g2">
      <div className="glass" style={{ gridColumn: "1 / -1" }}>
        <h3>Revenue — last 6 months</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, marginTop: 16 }}
          role="img" aria-label={`Monthly revenue: ${months.map((m) => `${m.label} ${usd(m.cents)}`).join(", ")}`}>
          {months.map((m) => (
            <div key={m.label} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                height: Math.max(4, (m.cents / max) * 100), borderRadius: "6px 6px 0 0",
                background: "linear-gradient(180deg, var(--gold-light), var(--gold))",
                boxShadow: "0 0 14px rgba(201,164,92,.3)", transition: "height .6s",
              }} />
              <div style={{ fontSize: 11.5, opacity: .7, marginTop: 6 }}>{m.label}</div>
              <div className="mi-price" style={{ fontSize: 12 }}>{usd(m.cents)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass">
        <h3>Key numbers</h3>
        {[
          ["Total revenue (all time)", usd(revenue)],
          ["Average booking", avgBooking ? usd(avgBooking) : "—"],
          ["Lead → confirmed conversion", `${conversion}%`],
          ["Repeat customers", String(repeatEmails)],
          ["Events booked", String(events.length)],
        ].map(([k, v]) => (
          <div key={k} className="lead" style={{ padding: "10px 0" }}>
            <span style={{ opacity: .75 }}>{k}</span><b className="mi-price">{v}</b>
          </div>
        ))}
      </div>

      <div className="glass">
        <h3>Where demand comes from</h3>
        <p style={{ fontSize: 12.5, marginBottom: 8 }}>Lead sources</p>
        {bars(bySource)}
        <p style={{ fontSize: 12.5, margin: "14px 0 8px" }}>Event types</p>
        {bars(byType)}
      </div>
    </div>
  );
}

function count(arr: any[], key: (x: any) => string) {
  return arr.reduce((m: Record<string, number>, x) => ((m[key(x)] = (m[key(x)] || 0) + 1), m), {});
}

function bars(data: Record<string, number>) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  if (!entries.length) return <p style={{ fontSize: 13 }}>No data yet.</p>;
  return entries.map(([label, n]) => (
    <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
      <span style={{ fontSize: 13, width: 130, opacity: .8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(246,239,227,.08)" }}>
        <div style={{ width: `${(n / max) * 100}%`, height: "100%", borderRadius: 4, background: "var(--gold)" }} />
      </div>
      <span className="mi-price" style={{ fontSize: 13 }}>{n}</span>
    </div>
  ));
}
