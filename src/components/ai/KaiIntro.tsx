"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * KaiIntro — Kai's welcome, played full-screen when a visitor lands.
 *
 * Deliberately a still frame with his voice over it, not a talking video.
 * Generated lip sync kept landing out of step, and a mouth that misses the
 * words reads as cheap in a way a portrait never does. A slow push-in keeps
 * it feeling alive, and the voice carries the greeting.
 *
 * Browsers block autoplay that has sound, so the greeting waits behind a
 * "Tap for sound" control. Anyone who ignores it still gets the visual and
 * is moved along automatically — the site is never held hostage to the intro.
 */

// Amy's real trailer, served from this repo — not a generated approximation.
// Generated versions kept getting the colour wrong (teal instead of the actual
// forest green, daylight instead of dusk), and the real photograph is both
// correct by definition and faster to load than a remote file.
const KAI_STILL_SRC = "/gallery/hero-trailer.jpg";
const KAI_VOICE_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3EbQNf19wFua1cVPa80DiJhKD2X/hf_20260817_035126_440eb080-e2ab-4fa0-a3e4-ebe4ee8df0eb.wav";

const GREETING_TEXT =
  "Hello, I'm Kai — your Sophisticated Sips concierge. Tell me about your event, and I'll help you plan something unforgettable.";

const SEEN_KEY = "ss-kai-intro-v1";
export const INTRO_DONE_EVENT = "ss:kai-intro-done";
export const INTRO_ACTIVE_KEY = "ss-kai-intro-active";

const SILENT_MS = 6500;   // long enough to read the line, short enough not to nag
const MAX_MS = 20000;     // hard ceiling, whatever happens

export default function KaiIntro() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const doneRef = useRef(false);

  // Homepage only, once per session, never in the owner area.
  useEffect(() => {
    if (pathname !== "/") return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      sessionStorage.setItem(SEEN_KEY, "1");
      sessionStorage.setItem(INTRO_ACTIVE_KEY, "1");
    } catch { return; }
    setShow(true);
  }, [pathname]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    audioRef.current?.pause();
    setLeaving(true);
    try { sessionStorage.removeItem(INTRO_ACTIVE_KEY); } catch {}
    window.dispatchEvent(new CustomEvent(INTRO_DONE_EVENT));
    window.setTimeout(() => setShow(false), 700);
  }, []);

  // Move visitors along on their own: quickly if they never asked for sound,
  // and at a hard ceiling regardless so nothing can strand them here.
  useEffect(() => {
    if (!show) return;
    const quiet = window.setTimeout(() => { if (!playing) finish(); }, SILENT_MS);
    const ceiling = window.setTimeout(finish, MAX_MS);
    return () => { window.clearTimeout(quiet); window.clearTimeout(ceiling); };
  }, [show, playing, finish]);

  const playGreeting = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().then(() => setPlaying(true)).catch(() => finish());
  };

  if (!show) return null;

  return (
    <div className={`kai-intro ${leaving ? "leaving" : ""}`} role="dialog" aria-label="Welcome from Kai">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="kai-intro-still" src={KAI_STILL_SRC} alt="The Sophisticated Sips mobile espresso trailer at dusk" />
      <div className="kai-intro-veil" aria-hidden="true" />

      <audio ref={audioRef} src={KAI_VOICE_SRC} preload="auto" onEnded={finish} onError={() => setPlaying(false)} />

      <div className="kai-intro-copy">
        <span className="kai-intro-name">Kai · Your Concierge</span>
        <p>{GREETING_TEXT}</p>
      </div>

      {!playing && (
        <button className="kai-intro-sound" onClick={playGreeting}>🔊 Hear Kai</button>
      )}
      <button className="kai-intro-skip" onClick={finish}>Skip ▸</button>
    </div>
  );
}
