"use client";

import { useEffect, useRef, useState } from "react";
import { useKaiSpeech } from "@/lib/useKaiSpeech";

type Message = { role: "user" | "assistant"; content: string };
type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

const START: Message = {
  role: "assistant",
  content: "Good to see you, Amy. Ask me about bookings, leads, money, menu performance, outreach, or what needs attention today.",
};

function startVoice(setInput: (value: string) => void, setListening: (value: boolean) => void) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return false;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    setInput(event.results[0]?.[0]?.transcript || "");
  };
  recognition.onend = () => setListening(false);
  recognition.onerror = () => setListening(false);
  setListening(true);
  recognition.start();
  return true;
}

export default function OwnerKaiStage() {
  const [messages, setMessages] = useState<Message[]>([START]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const speech = useKaiSpeech();

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/owner/kai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      const data = await response.json();
      const reply = data.reply || data.error || "I couldn't reach the business data just now. Your manual controls still work.";
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      speech.speak(reply);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "I couldn't connect just now. Your dashboard and manual controls are still available." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const listen = () => {
    setVoiceUnavailable(false);
    if (!startVoice(setInput, setListening)) setVoiceUnavailable(true);
  };

  return (
    <section className="kai-presence kai-presence-owner" aria-labelledby="kai-owner-title">
      <div className="kai-conversation">
        <div className="kai-eyebrow"><span /> Private owner mode</div>
        <h2 id="kai-owner-title">Kai, Amy&apos;s business copilot</h2>
        <div className="kai-owner-chat" ref={bodyRef} aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`kai-message ${message.role}`}>
              {message.content}
            </div>
          ))}
          {busy && <div className="kai-message assistant">Reviewing the business…</div>}
        </div>
        <div className="kai-prompt-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && send()}
            placeholder="Ask Kai what needs attention…"
            aria-label="Ask Kai about the business"
          />
          <button
            className={`kai-mic ${listening ? "listening" : ""}`}
            type="button"
            onClick={listen}
            aria-label={listening ? "Listening" : "Talk to Kai"}
          >
            {listening ? "●" : "🎙"}
          </button>
          <button className="btn btn-gold" type="button" onClick={() => send()} disabled={busy}>
            Ask Kai
          </button>
        </div>
        {voiceUnavailable && (
          <p className="kai-helper" role="status">Voice dictation is not available in this browser. You can still type to Kai.</p>
        )}
        <div className="kai-quick">
          <button onClick={() => send("What needs my attention today?")}>Today&apos;s priorities</button>
          <button onClick={() => send("Summarize my bookings and pipeline.")}>Bookings &amp; pipeline</button>
          <button onClick={() => send("How is the business performing this month?")}>Business performance</button>
          {speech.supported && (
            <button
              className={speech.enabled ? "on" : ""}
              aria-pressed={speech.enabled}
              onClick={() => speech.setEnabled(!speech.enabled)}
            >
              {speech.enabled ? "🔊 Kai speaks · on" : "🔇 Kai speaks · off"}
            </button>
          )}
          {speech.speaking && <button onClick={speech.stop}>■ Stop</button>}
        </div>
        <p className="kai-helper">Kai can analyze and prepare work. Sending messages, changing prices, and requesting payments still require Amy&apos;s approval.</p>
      </div>
      <div className="kai-character" aria-label="Kai, Amy's private Sophisticated Sips business copilot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/kai-ai-assistant.png" alt="Kai, Amy's private Sophisticated Sips business copilot" />
        <div className="kai-status"><span /> Owner mode</div>
      </div>
    </section>
  );
}
