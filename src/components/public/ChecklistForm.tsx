"use client";

import { FormEvent, useState } from "react";

export default function ChecklistForm() {
  const [form, setForm] = useState({ name: "", email: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError("Please add a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send the checklist.");
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the checklist.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="glass contact-success" role="status">
        <div aria-hidden="true">✦</div>
        <h2 className="serif">On its way</h2>
        <p>Check your inbox (and spam folder, just in case) for the checklist.</p>
      </div>
    );
  }

  return (
    <form className="glass contact-form" onSubmit={submit}>
      <input
        type="text"
        value={form.website}
        onChange={update("website")}
        tabIndex={-1}
        autoComplete="off"
        className="form-honeypot"
        aria-hidden="true"
      />
      <div className="field">
        <label htmlFor="checklist-name">First name (optional)</label>
        <input id="checklist-name" value={form.name} onChange={update("name")} autoComplete="given-name" />
      </div>
      <div className="field">
        <label htmlFor="checklist-email">Email</label>
        <input id="checklist-email" type="email" value={form.email} onChange={update("email")} autoComplete="email" required />
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="btn btn-gold" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send me the checklist"}
      </button>
    </form>
  );
}
