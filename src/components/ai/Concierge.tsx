"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };
type Appearance = {
  location_name: string;
  address: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
} | null;

const CHIPS = [
  "Plan a corporate event", "Estimate my budget", "Compare packages",
  "Build a drink menu", "Holiday event ideas", "Check available dates",
];
const STORE_KEY = "ss-concierge-v1";

function formatAppearance(a: Appearance): string {
  if (!a) return "";
  const date = new Date(`${a.event_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = a.start_time ? ` from ${a.start_time}${a.end_time ? ` to ${a.end_time}` : ""}` : "";
  return ` I'll also be at ${a.location_name} on ${date}${time} if you'd like to stop by in person!`;
}

export default function Concierge({ nextAppearance = null }: { nextAppearance?: Appearance }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const greeting: Msg = useMemo(() => ({
    role: "assistant",
    content: `Hi, I'm Kai, your Sophisticated Sips AI Concierge. I can help you plan your event, estimate guest needs, compare packages, build a menu, and pass the details directly to Amy.${formatAppearance(nextAppearance)} ✦`,
  }), [nextAppearance]);
  const [msgs, setMsgs] = useState<Msg[]>([greeting]);
  const [typed, setTyped] = useState(0); // typewriter cursor for the latest assistant reply
  const bodyRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

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

  const send = useCallback(async (text?: string) => {
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
  }, [busy, input, msgs]);

  useEffect(() => {
    const handler = (event: Event) => {
      const question = (event as CustomEvent<{ question?: string }>).detail?.question?.trim();
      setOpen(true);
      if (question) window.setTimeout(() => send(question), 0);
    };
    window.addEventListener("ss:concierge", handler);
    return () => window.removeEventListener("ss:concierge", handler);
  }, [send]);

  const shown = (m: Msg, i: number) =>
    i === msgs.length - 1 && m.role === "assistant" ? m.content.slice(0, typed) : m.content;

  if (pathname?.startsWith("/owner")) return null;

  return (
    <>
      {!open && (
        <button className="fab" onClick={() => setOpen(true)} aria-label="Open Kai, the AI Concierge">
          <Image src="/brand/kai-ai-assistant.png" alt="" width={40} height={84} priority />
        </button>
      )}
      {open && (
        <div className="chat kai-window" role="dialog" aria-label="Kai AI Concierge">
          <div className="kai-portrait-window">
            <Image
              src="/brand/kai-ai-assistant.png"
              alt="Kai, Sophisticated Sips AI Concierge"
              width={864}
              height={1821}
              sizes="(max-width: 820px) 100vw, 330px"
            />
            <div className="kai-live"><i />Kai · Live</div>
          </div>
          <div className="kai-chat-side">
            <div className="chat-h">
              <div>
                <b style={{ fontSize: 18 }}>Kai · AI Concierge</b>
                <div style={{ fontSize: 11.5, opacity: 0.65 }}>Sophisticated Sips · here to plan with you</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="mini-btn" onClick={() => { setOpen(false); router.push("/book"); }}>Get a quote →</button>
                <button className="mini-btn" onClick={() => setOpen(false)} aria-label="Close Kai AI Concierge">✕</button>
              </div>
            </div>
            <div className="chat-body" ref={bodyRef} aria-live="polite">
              {msgs.map((m, i) => (
                <div key={i} className={`msg ${m.role === "assistant" ? "ai" : "me"}`}>{shown(m, i)}</div>
              ))}
              {busy && <div className="msg ai dots" aria-label="Kai is typing"><span /><span /><span /></div>}
            </div>
            <div className="qchips">
              {CHIPS.map((c) => <button key={c} className="qchip" onClick={() => send(c)}>{c}</button>)}
            </div>
            <div className="chat-in">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Kai about your event…"
                aria-label="Message Kai" enterKeyHint="send"
                onKeyDown={(e) => e.key === "Enter" && send()} />
              <button className="btn btn-gold" style={{ padding: "10px 18px", minHeight: 44 }} onClick={() => send()}>Send</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
