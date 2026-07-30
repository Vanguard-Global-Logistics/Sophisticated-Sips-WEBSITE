"use client";

import { useState } from "react";

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

function listen(setInput: (value: string) => void, setListening: (value: boolean) => void) {
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

export default function KaiPublicStage() {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);

  const openKai = (question?: string) => {
    window.dispatchEvent(new CustomEvent("ss:concierge", { detail: { question: question?.trim() } }));
    setInput("");
  };

  const startListening = () => {
    setVoiceUnavailable(false);
    if (!listen(setInput, setListening)) setVoiceUnavailable(true);
  };

  return (
    <section id="kai" className="kai-presence kai-presence-public" aria-labelledby="kai-public-title">
      <div className="kai-conversation">
        <div className="kai-eyebrow"><span /> Kai · AI event concierge</div>
        <h2 id="kai-public-title">Meet Kai</h2>
        <p>
          Tell Kai about your event. He can help shape the menu, compare catering experiences,
          estimate guest needs, and pass a complete request directly to Amy.
        </p>
        <div className="kai-prompt-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && openKai(input)}
            placeholder="Ask Kai about your event…"
            aria-label="Ask Kai about your event"
          />
          <button
            className={`kai-mic ${listening ? "listening" : ""}`}
            type="button"
            onClick={startListening}
            aria-label={listening ? "Listening" : "Talk to Kai"}
          >
            {listening ? "●" : "🎙"}
          </button>
          <button className="btn btn-gold" type="button" onClick={() => openKai(input)}>
            Talk to Kai
          </button>
        </div>
        {voiceUnavailable && (
          <p className="kai-helper" role="status">Voice dictation is not available in this browser. You can still type to Kai.</p>
        )}
        <div className="kai-quick">
          <button onClick={() => openKai("Help me plan a corporate event")}>Corporate event</button>
          <button onClick={() => openKai("Compare your catering packages")}>Compare packages</button>
          <button onClick={() => openKai("Help me build a drink menu")}>Build my menu</button>
        </div>
      </div>
      <div className="kai-character" aria-label="Kai, Sophisticated Sips AI concierge">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/kai-ai-assistant.png" alt="Kai, Sophisticated Sips AI concierge" />
        <div className="kai-status"><span /> Ready to help</div>
      </div>
    </section>
  );
}
