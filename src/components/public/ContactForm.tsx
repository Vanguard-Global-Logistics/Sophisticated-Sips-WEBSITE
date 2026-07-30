"use client";

import { FormEvent, useState } from "react";

const SUBJECTS = [
  "General question",
  "Catering and packages",
  "Menu and dietary needs",
  "Existing booking",
  "Partnership or venue",
  "Other",
];

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: SUBJECTS[0],
    message: "",
    website: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.message.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError("Please add your name, a valid email, and your question.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your message could not be sent.");
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your message could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="glass contact-success" role="status">
        <div aria-hidden="true">✦</div>
        <h2 className="serif">Message received</h2>
        <p>Amy will review your note personally and follow up shortly. A confirmation is on its way to your inbox.</p>
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
      <div className="fgrid">
        <div className="field">
          <label htmlFor="contact-name">Name</label>
          <input id="contact-name" value={form.name} onChange={update("name")} autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="contact-email">Email</label>
          <input id="contact-email" type="email" value={form.email} onChange={update("email")} autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="contact-phone">Phone</label>
          <input id="contact-phone" type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" />
        </div>
        <div className="field">
          <label htmlFor="contact-subject">How can we help?</label>
          <select id="contact-subject" value={form.subject} onChange={update("subject")}>
            {SUBJECTS.map((subject) => <option key={subject}>{subject}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          rows={6}
          value={form.message}
          onChange={update("message")}
          maxLength={3000}
          placeholder="Tell Amy what you have in mind."
          required
        />
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="btn btn-gold" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
