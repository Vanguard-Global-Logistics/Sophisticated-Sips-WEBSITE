"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "Hi, I'm the Sophisticated Sips AI Concierge. I can help you plan your coffee catering event, estimate guest count and budget, compare packages, and get you to a quote. ✦",
};
const CHIPS = [
  "Plan a corporate event", "Estimate my budget", "Compare packages",
  "Build a drink menu", "Holiday event ideas", "Check available dates",
];
const STORE_KEY = "ss-concierge-v1";

export default function Concierge() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [typed, setTyped] = useState(0); // typewriter cursor for the latest assistant reply
  const bodyRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Conversation memory: survives page navigation (layout persists) AND reloads (sessionStorage).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) { const m = JSON.parse(saved); if (Array.isArray(m) && m.length) { setMsgs(m); setTyped(Infinity); } }
    } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-24))); } catch {}
  }, [msgs]);

  // Typewriter reveal for the newest assistant message.
  const last = msgs[msgs.length - 1];
  const revealing = last?.role === "assistant" && typed < last.content.length;
  useEffect(() => {
    if (!revealing) return;
    const t = setInterval(() => setTyped((n) => n + 3), 16);
    return () => clearInterval(t);
  }, [revealing, msgs.length]);

  useEffect(() => { bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight); }, [msgs, busy, typed, open]);

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/ai-concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = data.reply || "I'm having a quiet moment — please try again.";
      setTyped(0);
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setTyped(Infinity);
      setMsgs((m) => [...m, { role: "assistant", content: "I couldn't connect just now — but the Book Event form works beautifully, and Amy answers every request personally." }]);
    }
    setBusy(false);
  };

  const shown = (m: Msg, i: number) =>
    i === msgs.length - 1 && m.role === "assistant" ? m.content.slice(0, typed) : m.content;

  return (
    <>
      <button className="fab" onClick={() => setOpen(!open)}
        aria-label={open ? "Close AI Concierge" : "Open AI Concierge"} aria-expanded={open}>
        {open ? "✕" : "✦"}
      </button>
      {open && (
        <div className="chat" role="dialog" aria-label="AI Concierge">
          <div className="chat-h">
            <div>
              <b style={{ fontSize: 14 }}>AI Concierge</b>
              <div style={{ fontSize: 11.5, opacity: 0.65 }}>Sophisticated Sips · here to plan with you</div>
            </div>
            <button className="mini-btn" onClick={() => { setOpen(false); router.push("/book"); }}>Get a quote →</button>
          </div>
          <div className="chat-body" ref={bodyRef} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role === "assistant" ? "ai" : "me"}`}>{shown(m, i)}</div>
            ))}
            {busy && <div className="msg ai dots" aria-label="Concierge is typing"><span /><span /><span /></div>}
          </div>
          <div className="qchips">
            {CHIPS.map((c) => <button key={c} className="qchip" onClick={() => send(c)}>{c}</button>)}
          </div>
          <div className="chat-in">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your event…"
              aria-label="Message the concierge" enterKeyHint="send"
              onKeyDown={(e) => e.key === "Enter" && send()} />
            <button className="btn btn-gold" style={{ padding: "10px 18px", minHeight: 44 }} onClick={() => send()}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
