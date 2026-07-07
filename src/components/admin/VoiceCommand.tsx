"use client";
import { useState } from "react";

type Props = {
  setTab: (t: any) => void;
  monthlyRevenue: string;
  todaysEvents: string;
  runMarketing: (theme: string) => void;
};

/** Voice control for the dashboard. Uses on-device Web Speech API — no audio leaves the browser
 *  except through the browser's own recognition service. Falls back to a typed command. */
export default function VoiceCommand({ setTab, monthlyRevenue, todaysEvents, runMarketing }: Props) {
  const [status, setStatus] = useState("");
  const [listening, setListening] = useState(false);

  const handle = (said: string) => {
    const s = said.toLowerCase();
    if (/(add|new).*(drink|product)|menu/.test(s)) { setTab("Menu Editor"); return `Opening the menu editor.`; }
    if (/invoice|deposit|payment/.test(s)) { setTab("Payments"); return "Opening payments — pick the event.";}
    if (/approve|email|outreach/.test(s)) { setTab("Approval Queue"); return "Here's your approval queue."; }
    if (/(today|schedule|event)/.test(s)) { setTab("Daily Summary"); return todaysEvents; }
    if (/(how much|revenue|make|made|money|sales)/.test(s)) { setTab("Insights"); return `Last 30 days: ${monthlyRevenue}.`; }
    if (/pipeline|lead|booking/.test(s)) { setTab("Pipeline"); return "Here's your pipeline."; }
    if (/christmas|holiday|valentine|seasonal|halloween|thanksgiving/.test(s)) {
      setTab("Marketing"); runMarketing(said); return "Drafting seasonal ideas now…";
    }
    if (/marketing|instagram|post|campaign/.test(s)) { setTab("Marketing"); return "Opening your Marketing Director."; }
    if (/insight|report|analytic|number/.test(s)) { setTab("Insights"); return "Here are your numbers."; }
    return `Heard "${said}" — try "show today's events", "how much did we make", "add a new drink", or "create a Christmas menu".`;
  };

  const listen = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      const typed = prompt('Voice isn\'t supported in this browser. Type a command instead (e.g. "show today\'s events"):');
      if (typed) setStatus(handle(typed));
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    setListening(true); setStatus("Listening…");
    r.onresult = (e: any) => { setListening(false); setStatus(handle(e.results[0][0].transcript)); };
    r.onerror = () => { setListening(false); setStatus("Didn't catch that — tap the mic and try again."); };
    r.onend = () => setListening(false);
    r.start();
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <button className={`mini-btn ${listening ? "gold" : ""}`} onClick={listen} aria-pressed={listening}>
        🎙 {listening ? "Listening…" : "Voice"}
      </button>
      {status && <span style={{ fontSize: 13, opacity: .8 }} role="status">{status}</span>}
    </span>
  );
}
