"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/database/supabase-browser";
import Marketing from "@/components/admin/tabs/Marketing";
import LeadFinder from "@/components/admin/tabs/LeadFinder";
import Insights from "@/components/admin/tabs/Insights";
import VoiceCommand from "@/components/admin/VoiceCommand";
import Help from "@/components/admin/Help";
import { forecastSupplies } from "@/lib/ai/forecast";

const TABS = ["Daily Summary", "Pipeline", "Lead Finder", "Approval Queue", "Marketing", "Insights", "Menu Editor", "Payments", "Growth Ideas"] as const;
const usd = (c: number) => `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function OwnerDashboard() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Daily Summary");
  const [leads, setLeads] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [flash, setFlash] = useState("");
  const [ideas, setIdeas] = useState("");
  const [briefing, setBriefing] = useState("");
  const [weather, setWeather] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [np, setNp] = useState({ category: "Signature", name: "", price_label: "", description: "" });

  const load = useCallback(async () => {
    const [l, d, m, e, p] = await Promise.all([
      sb.from("leads").select("*").order("created_at", { ascending: false }).limit(50),
      sb.from("email_drafts").select("*").order("created_at", { ascending: false }).limit(30),
      sb.from("menu_items").select("*").order("category").order("sort"),
      sb.from("events").select("*").order("event_date", { ascending: true }).limit(30),
      sb.from("payments").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const failed = [l, d, m, e, p].find((r) => r.error);
    if (failed?.error) setFlash("Some data didn't load — pull to refresh or sign in again.");
    setLeads(l.data || []); setDrafts(d.data || []); setMenu(m.data || []);
    setEvents(e.data || []); setPayments(p.data || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/weather").then((r) => r.json()).then(setWeather).catch(() => {});
    fetch("/api/owner/settings").then((r) => r.json()).then((d) => setSettings(d.settings)).catch(() => {});
  }, []);

  const note = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 4000); };

  /* ----- pipeline ----- */
  const setLeadStatus = async (id: string, status: string) => {
    await sb.from("leads").update({ status }).eq("id", id);
    if (status === "confirmed") {
      const lead = leads.find((l) => l.id === id);
      if (lead) await sb.from("events").insert({
        lead_id: id, title: `${lead.event_type} — ${lead.name}`, event_date: lead.event_date,
        guest_count: lead.guest_count, quote_total_cents: lead.est_value_cents,
        deposit_cents: Math.round((lead.est_value_cents || 0) * ((settings?.deposit_percent ?? 25) / 100)),
      });
      note("Confirmed — event created. Send the deposit link from the Payments tab.");
    }
    load();
  };

  /* ----- approval queue ----- */
  const decide = async (draftId: string, action: "approve" | "decline") => {
    setBusy(true);
    const res = await fetch("/api/outreach/approve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId, action }),
    });
    const data = await res.json();
    setBusy(false);
    note(data.reason || (data.status === "sent" ? "Email sent ✦" : data.status === "declined" ? "Draft declined." : "Done."));
    load();
  };

  /* ----- menu editor ----- */
  const addProduct = async () => {
    if (!np.name || !np.price_label) { note("Give the product a name and price."); return; }
    await sb.from("menu_items").insert({ ...np, is_signature: np.category === "Signature" });
    setNp({ ...np, name: "", price_label: "", description: "" });
    note("Added — it's live on the public menu."); load();
  };
  const toggleItem = async (id: string, active: boolean) => {
    await sb.from("menu_items").update({ active: !active }).eq("id", id); load();
  };

  /* ----- payments (Square) ----- */
  const paymentLink = async (ev: any, kind: "deposit" | "full") => {
    const amountCents = kind === "deposit" ? (ev.deposit_cents || 10000) : (ev.quote_total_cents || ev.deposit_cents || 10000);
    setBusy(true);
    const res = await fetch("/api/square/create-payment-link", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ev.id, kind, amountCents }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.url) { await navigator.clipboard?.writeText(data.url).catch(() => {}); note(`Square ${kind === "full" ? "full-payment" : "deposit"} link created and copied — text it to your client.`); }
    else note(data.error || "Couldn't create the payment link.");
  };
  const sendInvoice = async (ev: any) => {
    const balance = Math.max(0, (ev.quote_total_cents || 0) - (ev.deposit_cents || 0));
    setBusy(true);
    const res = await fetch("/api/square/create-invoice", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ev.id, amountCents: balance || ev.quote_total_cents }),
    });
    const data = await res.json();
    setBusy(false);
    note(data.ok ? "Square invoice sent by email ✦" : data.error || "Couldn't create the invoice.");
    load();
  };
  const checkPayment = async (paymentId: string) => {
    setBusy(true);
    const res = await fetch(`/api/square/payment-status?paymentId=${paymentId}`);
    const data = await res.json();
    setBusy(false);
    note(data.paid ? "Paid ✦ — records updated." : data.error || `Not paid yet (Square: ${data.orderState}).`);
    load();
  };

  /* ----- AI secretary ----- */
  const draftEmail = async (leadId: string) => {
    setBusy(true);
    const res = await fetch("/api/ai-secretary/draft-email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) { note(`Draft ready in the Approval Queue: "${data.subject}"`); setTab("Approval Queue"); }
    else note(data.error || "Couldn't draft the email.");
    load();
  };
  const dailyBriefing = async () => {
    setBusy(true); setBriefing("");
    const res = await fetch("/api/ai-secretary/daily-summary", { method: "POST" });
    const data = await res.json();
    setBriefing(data.reply || data.error || "No briefing came back — try again.");
    setBusy(false);
  };

  /* ----- growth ideas ----- */
  const growthIdeas = async () => {
    setBusy(true); setIdeas("");
    const res = await fetch("/api/growth-ideas", { method: "POST" });
    const data = await res.json();
    setIdeas(data.reply || data.error || "No ideas came back — try again.");
    setBusy(false);
  };

  const signOut = async () => { await sb.auth.signOut(); router.push("/owner/login"); };

  const newCount = leads.filter((l) => l.status === "new").length;
  const hotCount = leads.filter((l) => l.status === "hot").length;
  const pipeline = leads.filter((l) => !["declined"].includes(l.status)).reduce((s, l) => s + (l.est_value_cents || 0), 0);
  const pending = drafts.filter((d) => d.status === "pending");
  const weekAgo = Date.now() - 7 * 864e5, monthAgo = Date.now() - 30 * 864e5;
  const paidOnly = payments.filter((p) => p.status === "paid" && p.paid_at);
  const weekly = paidOnly.filter((p) => new Date(p.paid_at).getTime() > weekAgo).reduce((s, p) => s + p.amount_cents, 0);
  const monthly = paidOnly.filter((p) => new Date(p.paid_at).getTime() > monthAgo).reduce((s, p) => s + p.amount_cents, 0);

  const today = new Date().toISOString().slice(0, 10);
  const todaysEvents = events.filter((e) => e.event_date === today && e.status === "scheduled");
  const todaysGuests = todaysEvents.reduce((s, e) => s + (e.guest_count || 0), 0);
  const staffNeeded = todaysGuests === 0 ? 0 : todaysGuests > 120 ? 3 : todaysGuests > 50 ? 2 : 1;
  const outstanding = events.filter((e) => e.status === "scheduled" && (!e.deposit_paid || !e.balance_paid)).length;
  const profitEst = Math.round(monthly * 0.55); // heuristic: ~45% goods+fuel+labor
  const supplies = forecastSupplies(events.filter((e) => e.status === "scheduled"));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const ownerName = (settings?.owner_name || "").trim() || "there";

  return (
    <div className="section">
      <div className="wrap">
        <div className="morning">
          <div>
            <div className="sec-kicker">Owner command center</div>
            <h1 className="serif">{greeting}, {ownerName} ✦</h1>
            <p style={{ fontSize: 14, opacity: .7, marginTop: 6 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {" · "}{todaysEvents.length === 0 ? "no events today" : `${todaysEvents.length} event${todaysEvents.length > 1 ? "s" : ""} today · ~${staffNeeded} barista${staffNeeded > 1 ? "s" : ""} needed`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <VoiceCommand setTab={setTab} monthlyRevenue={usd(monthly)}
              todaysEvents={todaysEvents.length === 0 ? "Nothing scheduled today." : `${todaysEvents.length} event(s) today: ${todaysEvents.map((e) => e.title).join("; ")}`}
              runMarketing={(theme) => {
                fetch("/api/ai-marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: "campaign", theme }) })
                  .then((r) => r.json()).then((d) => note(d.reply ? "Seasonal drafts ready in Marketing ✦" : d.error || "Try again"));
              }} />
            {weather?.available && (
              <span className="weather">☀ {weather.high}° / {weather.low}°{weather.rainChance > 30 ? ` · ${weather.rainChance}% rain` : ""}</span>
            )}
            <a className="mini-btn" href="/owner/setup">⚙ Setup</a>
            <a className="mini-btn" href="/owner/training">📖 Training</a>
            <button className="mini-btn" onClick={signOut}>Sign out</button>
          </div>
        </div>

        <div className="kai">
          <div className="kai-head">
            <div className="kai-orb" aria-hidden="true">K</div>
            <div>
              <div className="kai-title">KAI</div>
              <div className="kai-sub">Your business assistant</div>
            </div>
          </div>
          <p className="kai-say">
            Soon you&apos;ll just tell me: <b>&ldquo;change the mocha to $6.75,&rdquo;</b> <b>&ldquo;print 50 flyers,&rdquo;</b> or <b>&ldquo;show tomorrow&apos;s orders.&rdquo;</b> Voice is on the way — for now, every job has a button.
          </p>
          <div className="kai-actions">
            <a href="/owner/menu"><span className="ico">☕</span> Edit menu &amp; prices</a>
            <a href="/menu/print" target="_blank" rel="noreferrer"><span className="ico">🖨</span> Print Menu Flyer</a>
            <button onClick={() => setTab("Payments")}><span className="ico">🧾</span> Today&apos;s orders &amp; invoices</button>
            <button onClick={() => { setTab("Daily Summary"); dailyBriefing(); }}><span className="ico">✦</span> Ask for a briefing</button>
          </div>
          <div className="kai-note">Manual controls always work — even if the AI is unavailable.</div>
        </div>

        <div className="qa" role="navigation" aria-label="Quick actions">
          <button onClick={() => setTab("Payments")}><span>🧾</span>Create invoice</button>
          <button onClick={() => setTab("Approval Queue")}><span>✉️</span>Approve emails{pending.length > 0 ? ` (${pending.length})` : ""}</button>
          <button onClick={() => setTab("Payments")}><span>💳</span>Send deposit</button>
          <button onClick={() => router.push("/owner/menu")}><span>☕</span>Edit menu</button>
          <a className="qa-link" href="/menu/print" target="_blank" rel="noreferrer"><span>🖨</span>Print flyer</a>
          <button onClick={() => setTab("Growth Ideas")}><span>📈</span>Growth report</button>
        </div>
        <div style={{ height: 10 }} />

        {flash && <div className="glass" style={{ padding: "12px 18px", marginBottom: 16, borderColor: "var(--gold)" }}>{flash}</div>}

        <div className="grid g4">
          <div className="glass stat"><div className="n serif">{newCount}</div><div className="l">New requests</div></div>
          <div className="glass stat"><div className="n serif">{hotCount}</div><div className="l">Hot leads</div></div>
          <div className="glass stat"><div className="n serif">{usd(pipeline)}</div><div className="l">Pipeline est.</div></div>
          <div className="glass stat"><div className="n serif">{outstanding}</div><div className="l">Unpaid balances</div></div>
        </div>

        <div className="atabs">
          {TABS.map((t) => <button key={t} className={`mtab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
        </div>

        {tab === "Daily Summary" && (
          <div className="grid g2">
            <div className="glass" style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <h3>AI morning briefing</h3>
                <button className="btn btn-ai" style={{ padding: "10px 18px", minHeight: 44 }} disabled={busy} onClick={dailyBriefing}>
                  {busy ? "Thinking…" : "✦ Generate today's briefing"}
                </button>
              </div>
              {briefing && <p style={{ whiteSpace: "pre-wrap", marginTop: 14, fontSize: 14.5, lineHeight: 1.75 }}>{briefing}</p>}
            </div>
            <div className="glass">
              <h3>Today at a glance</h3>
              <p>You have <b style={{ color: "var(--gold-light)" }}>{newCount} new request{newCount === 1 ? "" : "s"}</b> and {hotCount} hot lead{hotCount === 1 ? "" : "s"}, with roughly {usd(pipeline)} in the pipeline. {pending.length} email draft{pending.length === 1 ? "" : "s"} await{pending.length === 1 ? "s" : ""} your approval — nothing sends until you say so.</p>
              <div style={{ marginTop: 12 }}>
                {todaysEvents.length === 0
                  ? <p style={{ fontSize: 13.5 }}>Nothing on today&apos;s schedule — a good day for outreach.</p>
                  : todaysEvents.map((e) => (
                    <div key={e.id} className="lead" style={{ padding: "8px 0" }}>
                      <span style={{ fontSize: 14 }}>{e.title}</span>
                      <span className={`badge ${e.deposit_paid ? "b-ok" : "b-hot"}`}>{e.deposit_paid ? "deposit paid" : "deposit due"}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="glass">
              <h3>Real revenue (Square)</h3>
              <div className="lead" style={{ padding: "10px 0" }}><span style={{ opacity: .75 }}>Last 7 days</span><b className="mi-price">{usd(weekly)}</b></div>
              <div className="lead" style={{ padding: "10px 0" }}><span style={{ opacity: .75 }}>Last 30 days</span><b className="mi-price">{usd(monthly)}</b></div>
              <div className="lead" style={{ padding: "10px 0" }}><span style={{ opacity: .75 }}>Confirmed events</span><b className="mi-price">{events.filter((e) => e.status === "scheduled").length}</b></div>
              <div className="lead" style={{ padding: "10px 0" }}><span style={{ opacity: .75 }}>Profit estimate (30d)</span><b className="mi-price">{usd(profitEst)}</b></div>
              <p style={{ marginTop: 8, fontSize: 12, opacity: .55 }}>Profit assumes ~45% costs — tune once real cost data exists.</p>
            </div>
            <div className="glass" style={{ gridColumn: "1 / -1" }}>
              <h3>Supply forecast — next 7 days</h3>
              {supplies.eventCount === 0 ? (
                <p style={{ marginTop: 8 }}>No events in the next week — nothing to shop for yet.</p>
              ) : (
                <div className="grid g4" style={{ marginTop: 12 }}>
                  {[["☕ Beans", `${supplies.beansLb} lb`], ["🥛 Milk", `${supplies.milkGal} gal`], ["🧊 Ice", `${supplies.iceLb} lb`], ["🥤 Cups", `${supplies.cups}`]].map(([k, v]) => (
                    <div key={k} className="stat" style={{ padding: "10px 0", textAlign: "center" }}>
                      <div className="n serif" style={{ fontSize: 24 }}>{v}</div>
                      <div className="l">{k}</div>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ marginTop: 10, fontSize: 12, opacity: .55 }}>
                Derived from {supplies.eventCount} booked event{supplies.eventCount === 1 ? "" : "s"} (~{supplies.guests} guests, ~{supplies.drinks} drinks). Tune the per-guest constants in lib/ai/forecast.ts to Amy's actuals.</p>
            </div>
          </div>
        )}

        {tab === "Pipeline" && (
          <div className="glass">
            <h3 style={{ marginBottom: 6 }}>Booking pipeline
              <Help what="Every inquiry, from the website, the concierge, or your Lead Finder."
                how="Confirm turns a lead into an event with a deposit. Draft outreach writes an email for your approval."
                watchOut="Confirm only when the date is truly agreed — it creates the event your payments attach to." /></h3>
            {leads.length === 0 && <p style={{ padding: "16px 0" }}>No leads yet — new booking requests land here automatically.</p>}
            {leads.map((l) => (
              <div key={l.id} className="lead">
                <div style={{ minWidth: 170 }}>
                  <div style={{ fontWeight: 500 }}>{l.name}</div>
                  <div style={{ fontSize: 12.5, opacity: .65 }}>{l.event_type} · {l.event_date} · {l.guest_count} guests · score {l.score}</div>
                </div>
                <span className={`badge ${l.status === "hot" ? "b-hot" : l.status === "new" ? "b-new" : "b-ok"}`}>{l.status}</span>
                <span className="mi-price" style={{ fontSize: 14 }}>{usd(l.est_value_cents || 0)}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="mini-btn" onClick={() => setLeadStatus(l.id, "contacted")}>Contacted</button>
                  <button className="mini-btn gold" onClick={() => setLeadStatus(l.id, "confirmed")}>Confirm</button>
                  <button className="mini-btn" onClick={() => setLeadStatus(l.id, "declined")}>Decline</button>
                  <button className="mini-btn" disabled={busy} onClick={() => draftEmail(l.id)}>✦ Draft outreach</button>
                  {l.contact_phone && <a className="mini-btn" href={`tel:${l.contact_phone}`}>📞 Call</a>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "Approval Queue" && (
          <div className="grid" style={{ gap: 16 }}>
            <div className="glass" style={{ padding: "16px 24px" }}><h3 style={{ margin: 0 }}>Approval queue
              <Help what="Every AI-written email waits here. Nothing ever sends without your tap."
                how="Read it like it came from your own pen — Approve to send, Decline to discard."
                watchOut="Approved emails go to real inboxes under your name. If in doubt, decline and redraft." /></h3></div>
            {drafts.length === 0 && <div className="glass"><p>No drafts yet. The daily assistant drafts follow-ups for quiet leads — they'll appear here for your approval.</p></div>}
            {drafts.map((d) => (
              <div key={d.id} className="glass">
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 14 }}><b>To:</b> {d.to_email} · <b>Subject:</b> {d.subject}{d.is_follow_up && " · follow-up"}</div>
                  <span className={`badge ${d.status === "sent" ? "b-hot" : d.status === "pending" ? "b-new" : "b-ok"}`}>{d.status}</span>
                </div>
                <p style={{ whiteSpace: "pre-wrap", marginTop: 12, fontSize: 13.5, opacity: .8 }}>{d.body}</p>
                <p style={{ marginTop: 10, fontSize: 12, opacity: .55 }}>An unsubscribe link is added automatically on send.</p>
                {d.status === "pending" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="mini-btn gold" disabled={busy} onClick={() => decide(d.id, "approve")}>Approve & send</button>
                    <button className="mini-btn" disabled={busy} onClick={() => decide(d.id, "decline")}>Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "Menu Editor" && (
          <div className="grid g2">
            <div className="glass">
              <h3>Add a product</h3>
              <div className="field" style={{ marginTop: 12 }}><label>Category</label>
                <select value={np.category} onChange={(e) => setNp({ ...np, category: e.target.value })}>
                  {["Iced Espresso", "Hot Espresso", "Non-Espresso", "Signature"].map((c) => <option key={c}>{c}</option>)}
                </select></div>
              <div className="field"><label>Product name</label><input value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="e.g. Caramel Coast Cold Brew" /></div>
              <div className="field"><label>Price</label><input value={np.price_label} onChange={(e) => setNp({ ...np, price_label: e.target.value })} placeholder="e.g. 16 oz $6 · 24 oz $7" /></div>
              <div className="field"><label>Description</label><input value={np.description} onChange={(e) => setNp({ ...np, description: e.target.value })} placeholder="One tasty sentence" /></div>
              <button className="btn btn-gold" style={{ width: "100%" }} onClick={addProduct}>Add to menu</button>
            </div>
            <div className="glass">
              <h3>Current menu</h3>
              {menu.map((m) => (
                <div key={m.id} className="lead" style={{ padding: "9px 0" }}>
                  <span style={{ fontSize: 14, opacity: m.active ? 1 : .4 }}>{m.name} <span style={{ opacity: .5 }}>· {m.category}</span></span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="mi-price" style={{ fontSize: 13 }}>{m.price_label}</span>
                    <button className="mini-btn" onClick={() => toggleItem(m.id, m.active)}>{m.active ? "Hide" : "Show"}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Payments" && (
          <div className="glass">
            <h3>Events & deposits
              <Help what="Confirmed events and their money status, synced with Square."
                how="Deposit link and Full payment copy a Square checkout link to text your client. Send balance invoice emails a Square invoice."
                watchOut="Stuck on 'pending' after they paid? Tap Check payment — it reconciles directly with Square." /></h3>
            {events.length === 0 && <p style={{ padding: "14px 0" }}>Confirm a lead in the Pipeline to create an event here, then create a Square deposit link.</p>}
            {events.map((ev) => (
              <div key={ev.id} className="lead">
                <div style={{ minWidth: 170 }}>
                  <div style={{ fontWeight: 500 }}>{ev.title}</div>
                  <div style={{ fontSize: 12.5, opacity: .65 }}>{ev.event_date} · {ev.guest_count} guests · quote {usd(ev.quote_total_cents || 0)}</div>
                </div>
                <span className={`badge ${ev.deposit_paid ? "b-hot" : "b-new"}`}>{ev.deposit_paid ? "Deposit paid" : "Deposit due"}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {!ev.deposit_paid && (
                    <>
                      <button className="mini-btn gold" disabled={busy} onClick={() => paymentLink(ev, "deposit")}>
                        Deposit link ({usd(ev.deposit_cents || 10000)})
                      </button>
                      <button className="mini-btn" disabled={busy} onClick={() => paymentLink(ev, "full")}>
                        Full payment ({usd(ev.quote_total_cents || 0)})
                      </button>
                    </>
                  )}
                  {ev.deposit_paid && !ev.balance_paid && (
                    <button className="mini-btn gold" disabled={busy} onClick={() => sendInvoice(ev)}>Send balance invoice</button>
                  )}
                  {payments.filter((p: any) => p.event_id === ev.id && p.status !== "paid").slice(0, 1).map((p: any) => (
                    <button key={p.id} className="mini-btn" disabled={busy} onClick={() => checkPayment(p.id)}>Check payment</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "Lead Finder" && <LeadFinder onSaved={load} />}
        {tab === "Marketing" && <Marketing />}
        {tab === "Insights" && <Insights leads={leads} events={events} payments={payments} />}

        {tab === "Growth Ideas" && (
          <div className="glass">
            <h3>Monthly growth ideas</h3>
            <p style={{ margin: "8px 0 16px" }}>Ideas grounded in your real lead mix and the current season.</p>
            <button className="btn btn-ai" onClick={growthIdeas} disabled={busy}>{busy ? "Thinking…" : "✦ Generate this month's ideas"}</button>
            {ideas && <p style={{ whiteSpace: "pre-wrap", marginTop: 18, fontSize: 14.5, lineHeight: 1.8 }}>{ideas}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
