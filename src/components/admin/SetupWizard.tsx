"use client";
import { useEffect, useState } from "react";
import TransferOwnership from "@/components/admin/TransferOwnership";

const STEPS = ["Business", "Square", "Email", "AI", "Menu", "Booking", "Admins", "Launch"] as const;

const CHECKS = [
  ["booking", "Test booking submitted on /book and visible in the Pipeline"],
  ["email", "Test email received (Step 3 button)"],
  ["square", "Square connected and a sandbox deposit link paid end-to-end"],
  ["ai", "AI Concierge and AI Secretary both answered (Step 4 buttons)"],
  ["mobile", "Walked the whole site on an iPhone — booking, chat, dashboard"],
] as const;

export default function SetupWizard() {
  const [step, setStep] = useState(0);
  const [s, setS] = useState<any>(null);       // business_settings row
  const [status, setStatus] = useState<any>(null); // connection status
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetch("/api/owner/settings").then((r) => r.json()).then((d) => setS(d.settings));
    fetch("/api/owner/status").then((r) => r.json()).then(setStatus);
  };
  useEffect(load, []);

  const note = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 6000); };
  const set = (k: string) => (e: any) => setS({ ...s, [k]: e.target.value });
  const wizard = s?.wizard || {};

  const save = async (extra: any = {}) => {
    setBusy(true);
    const res = await fetch("/api/owner/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, ...extra }),
    });
    const d = await res.json();
    setBusy(false);
    note(d.ok ? "Saved ✦" : d.error || "Couldn't save.");
    if (d.ok && extra.wizard) setS({ ...s, ...extra });
  };

  const test = async (kind: string) => {
    setBusy(true);
    const res = await fetch("/api/owner/test", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }),
    });
    const d = await res.json();
    setBusy(false);
    note(d.message || d.error || "No response.");
  };

  const toggleCheck = (key: string) => {
    const w = { ...wizard, checks: { ...(wizard.checks || {}), [key]: !(wizard.checks || {})[key] } };
    save({ wizard: w });
  };
  const allChecked = CHECKS.every(([k]) => (wizard.checks || {})[k]);

  const Dot = ({ ok }: { ok: boolean }) => (
    <span className={`badge ${ok ? "b-hot" : "b-ok"}`} style={{ marginLeft: 8 }}>{ok ? "connected" : "not connected"}</span>
  );

  if (!s || !status) return <div className="section"><div className="wrap"><p>Loading setup…</p></div></div>;

  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="sec-head" style={{ marginBottom: 18 }}>
          <div className="sec-kicker">First-time setup</div>
          <h1 className="sec-title serif">Setup Wizard</h1>
          <p className="sec-sub">Work left to right. Everything saves as you go — you can leave and come back anytime.</p>
          <a className="mini-btn" href="/owner" style={{ marginTop: 12, display: "inline-block" }}>← Back to dashboard</a>
        </div>

        <div className="atabs" role="tablist" aria-label="Setup steps">
          {STEPS.map((t, i) => (
            <button key={t} role="tab" aria-selected={i === step} className={`mtab ${i === step ? "on" : ""}`} onClick={() => setStep(i)}>
              {i + 1}. {t}
            </button>
          ))}
        </div>

        {status.envWarning && <div className="glass" style={{ padding: "12px 18px", marginBottom: 16, borderColor: "#F0B5A0" }} role="alert"><b>⚠ {status.envWarning}</b></div>}
        {flash && <div className="glass" style={{ padding: "12px 18px", marginBottom: 16, borderColor: "var(--gold)" }} role="status">{flash}</div>}

        {step === 0 && (
          <div className="glass">
            <h3>Business profile</h3>
            <p style={{ margin: "6px 0 16px" }}>This information appears in emails and legal footers.</p>
            {[["business_name","Business name"],["owner_name","Owner name"],["phone","Phone"],["mailing_address","Business mailing address (required on outreach emails)"],["service_area","Service area"],["domain","Website domain"]].map(([k, label]) => (
              <div className="field" key={k}>
                <label htmlFor={`bs-${k}`}>{label}</label>
                <input id={`bs-${k}`} value={s[k] || ""} onChange={set(k)} />
              </div>
            ))}
            <button className="btn btn-gold" style={{ width: "100%" }} disabled={busy} onClick={() => save()}>Save profile</button>
          </div>
        )}

        {step === 1 && (
          <div className="glass">
            <h3>Square payments <Dot ok={status.square.configured} /> <span className="badge b-ok" style={{ marginLeft: 6 }}>site: {status.appEnv}</span></h3>
            <div style={{ margin: "14px 0", fontSize: 14.5, lineHeight: 2 }}>
              <div>Environment: <b style={{ color: status.square.environment === "production" ? "var(--gold-light)" : "#9FD9C6" }}>{status.square.environment}</b></div>
              <div>Access token &amp; location: <b>{status.square.configured ? "set" : "missing"}</b> <span style={{ opacity: .6, fontSize: 12.5 }}>(set in hosting env vars — never shown here)</span></div>
              <div>Webhook signature key: <b>{status.square.webhookKeySet ? "set" : "missing"}</b></div>
            </div>
            <button className="btn btn-ai" disabled={busy} onClick={() => test("square")}>✦ Test Square connection</button>
            <p style={{ marginTop: 12, fontSize: 12.5, opacity: .6 }}>Full payment walkthrough (sandbox card, webhook): LAUNCH.md Steps 9–11.</p>
          </div>
        )}

        {step === 2 && (
          <div className="glass">
            <h3>Email <Dot ok={status.email.configured} /></h3>
            <div style={{ margin: "14px 0", fontSize: 14.5, lineHeight: 2 }}>
              <div>Sender: <b>{status.email.from || "not set"}</b></div>
              <div style={{ fontSize: 13, opacity: .7 }}>Until your domain verifies in Resend (SPF + DKIM), test emails only deliver to the Resend account owner.</div>
            </div>
            <button className="btn btn-ai" disabled={busy} onClick={() => test("email")}>✦ Send me a test email</button>
          </div>
        )}

        {step === 3 && (
          <div className="glass">
            <h3>AI systems <Dot ok={status.ai.configured} /></h3>
            <p style={{ margin: "8px 0 14px", fontSize: 14 }}>The AI key lives server-side only — this page shows status, never the key itself.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-ai" disabled={busy} onClick={() => test("ai")}>✦ Test AI connection</button>
              <a className="btn btn-ghost" href="/" target="_blank">Try the Concierge (opens site)</a>
              <a className="btn btn-ghost" href="/owner">Run the Secretary briefing →</a>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="glass">
            <h3>Menu</h3>
            <p style={{ margin: "8px 0 14px" }}>Your drinks, crepes, desserts, and Signature line already seeded from launch. Add, hide, or price items in the dashboard's Menu Editor — changes appear on the public menu instantly.</p>
            <a className="btn btn-gold" href="/owner">Open Menu Editor →</a>
          </div>
        )}

        {step === 5 && (
          <div className="glass">
            <h3>Booking rules</h3>
            <div className="field">
              <label htmlFor="bs-dep">Deposit percentage (used when you Confirm a lead)</label>
              <input id="bs-dep" type="number" min={5} max={100} value={s.deposit_percent ?? 25} onChange={set("deposit_percent")} />
            </div>
            <div className="field">
              <label htmlFor="bs-qr">Quote rules / travel notes (your reference while quoting)</label>
              <textarea id="bs-qr" rows={3} value={s.quote_rules || ""} onChange={set("quote_rules")} placeholder="e.g. +$50 beyond 25 miles; 2-hour minimum; schools get per-cup pricing" />
            </div>
            <div className="field">
              <label htmlFor="bs-cp">Cancellation policy (shown to clients on quotes/invoices you send)</label>
              <textarea id="bs-cp" rows={3} value={s.cancellation_policy || ""} onChange={set("cancellation_policy")} placeholder="e.g. Deposits refundable up to 14 days before the event…" />
            </div>
            <button className="btn btn-gold" style={{ width: "100%" }} disabled={busy} onClick={() => save()}>Save booking rules</button>
          </div>
        )}

        {step === 6 && (
          <div className="grid" style={{ gap: 16 }}>
            <div className="glass">
              <h3>Owner &amp; admin accounts</h3>
              <p style={{ margin: "8px 0 12px", fontSize: 14 }}>Accounts with full access to bookings, payments, and customer data:</p>
              {status.owners.map((o: string) => (
                <div key={o} className="lead" style={{ padding: "8px 0" }}><span>{o}</span><span className="badge b-hot">owner</span></div>
              ))}
              <p style={{ marginTop: 10, fontSize: 12.5, opacity: .6 }}>The system refuses to ever drop below one owner (database-enforced). A backup admin is added the same way as a transfer — just skip the final "complete" step.</p>
            </div>
            <TransferOwnership status={status} onChange={load} />
          </div>
        )}

        {step === 7 && (
          <div className="glass">
            <h3>Launch checklist</h3>
            <p style={{ margin: "8px 0 14px", fontSize: 14 }}>Tick each item only after you've genuinely done it. (The full 28-point engineering gate lives in LAUNCH.md.)</p>
            {CHECKS.map(([key, label]) => (
              <label key={key} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px dashed rgba(201,164,92,.22)", cursor: "pointer", fontSize: 14.5 }}>
                <input type="checkbox" checked={!!(wizard.checks || {})[key]} onChange={() => toggleCheck(key)} style={{ width: 20, height: 20, accentColor: "#C9A45C" }} />
                {label}
              </label>
            ))}
            <div style={{ marginTop: 20, textAlign: "center" }}>
              {allChecked
                ? <div className="badge b-hot" style={{ fontSize: 15, padding: "12px 26px" }}>✦ READY TO LAUNCH</div>
                : <div className="badge b-ok" style={{ fontSize: 13, padding: "10px 20px" }}>{CHECKS.filter(([k]) => (wizard.checks || {})[k]).length}/{CHECKS.length} complete</div>}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          <button className="mini-btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
          <button className="mini-btn gold" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>Next →</button>
        </div>
      </div>
    </div>
  );
}
