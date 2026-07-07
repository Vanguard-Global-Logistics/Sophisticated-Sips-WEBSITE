"use client";
import { useState } from "react";

const EVENT_TYPES = ["Corporate event","Employee appreciation","School event","Church event","Wedding","Private party","Sporting event","Holiday party","Vendor fair","Grand opening","Real estate event","Other"];
const PACKAGES = ["Not sure yet","The Espresso Hour","The Golden Event","Corporate Perk"];

export default function BookingForm() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState<any>({
    name: "", company: "", email: "", phone: "", event_type: EVENT_TYPES[0],
    event_date: "", event_time: "", location: "", guest_count: "",
    budget_range: "Not sure yet", package_interest: PACKAGES[0],
    drink_preferences: "", addons: "", notes: "", website: "", // honeypot
  });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    setErr("");
    if (!f.name || !f.email || !f.event_date) { setErr("Please add at least your name, email, and event date."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) { setErr("That email doesn't look right — mind double-checking it?"); return; }
    if (f.event_date < new Date().toISOString().slice(0, 10)) { setErr("That event date is in the past — pick an upcoming date."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setDone(true); window.scrollTo(0, 0);
    } catch (e: any) {
      setErr(e.message || "Could not send your request — please try again.");
    }
    setBusy(false);
  };

  if (done) return (
    <div className="glass" style={{ padding: "54px 30px", borderColor: "var(--gold)", textAlign: "center" }}>
      <div style={{ fontSize: 44 }}>✦</div>
      <h2 className="serif sec-title" style={{ margin: "14px 0" }}>Thank you</h2>
      <p className="sec-sub">Sophisticated Sips will review your event and respond shortly.
      A confirmation is on its way to your inbox.</p>
    </div>
  );

  return (
    <div className="glass" style={{ padding: 28 }}>
      <input type="text" value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off"
        style={{ position: "absolute", left: -9999, opacity: 0, height: 0 }} aria-hidden="true" />
      <div className="fgrid">
        <div className="field"><label htmlFor="bf-name">Name</label><input id="bf-name" required aria-required="true" value={f.name} onChange={set("name")} autoComplete="name" placeholder="Your full name" /></div>
        <div className="field"><label htmlFor="bf-company">Company</label><input id="bf-company" value={f.company} onChange={set("company")} autoComplete="organization" placeholder="Optional" /></div>
        <div className="field"><label htmlFor="bf-email">Email</label><input id="bf-email" required aria-required="true" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} placeholder="you@example.com" /></div>
        <div className="field"><label htmlFor="bf-phone">Phone</label><input id="bf-phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} placeholder="(555) 555-5555" /></div>
        <div className="field"><label htmlFor="bf-event-type">Event type</label><select id="bf-event-type" value={f.event_type} onChange={set("event_type")}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="field"><label htmlFor="bf-guest-count">Guest count</label><input id="bf-guest-count" type="number" inputMode="numeric" value={f.guest_count} onChange={set("guest_count")} placeholder="e.g. 75" /></div>
        <div className="field"><label htmlFor="bf-event-date">Event date</label><input id="bf-event-date" required aria-required="true" type="date" min={new Date().toISOString().slice(0, 10)} value={f.event_date} onChange={set("event_date")} /></div>
        <div className="field"><label htmlFor="bf-event-time">Event time</label><input id="bf-event-time" type="time" value={f.event_time} onChange={set("event_time")} /></div>
        <div className="field"><label htmlFor="bf-budget-range">Budget range</label><select id="bf-budget-range" value={f.budget_range} onChange={set("budget_range")}>{["Under $500","$500–$1,000","$1,000–$2,500","$2,500+","Not sure yet"].map((b) => <option key={b}>{b}</option>)}</select></div>
        <div className="field"><label htmlFor="bf-package-interest">Package interest</label><select id="bf-package-interest" value={f.package_interest} onChange={set("package_interest")}>{PACKAGES.map((p) => <option key={p}>{p}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="bf-event-location">Event location</label><input id="bf-event-location" value={f.location} onChange={set("location")} placeholder="Venue or address" /></div>
      <div className="field"><label htmlFor="bf-drink-preferences">Drink preferences</label><input id="bf-drink-preferences" value={f.drink_preferences} onChange={set("drink_preferences")} placeholder="e.g. iced lattes, Golden Pulse bar, kid-friendly options" /></div>
      <div className="field"><label htmlFor="bf-dessert-crepe-add-ons">Dessert / crepe add-ons</label><input id="bf-dessert-crepe-add-ons" value={f.addons} onChange={set("addons")} placeholder="e.g. crepe station, cheesecake display" /></div>
      <div className="field"><label htmlFor="bf-notes">Notes</label><textarea id="bf-notes" rows={3} value={f.notes} onChange={set("notes")} placeholder="Anything else we should know?" /></div>
      {err && <div className="form-error" role="alert">{err}</div>}
      <button className="btn btn-gold" style={{ width: "100%", marginTop: 6 }} onClick={submit} disabled={busy}>
        {busy ? "Sending…" : "Request My Catering Quote"}
      </button>
    </div>
  );
}
