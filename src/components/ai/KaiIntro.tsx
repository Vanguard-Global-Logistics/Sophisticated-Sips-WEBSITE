"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * KaiIntro — Kai's welcome, played full-screen when a visitor lands.
 *
 * The video and the voice are two separate files: the lip-sync repair that
 * produced this footage returns picture only. Rather than pay to re-render a
 * combined track, both elements are started from zero on the same tap, which
 * keeps them aligned for a clip this short.
 *
 * Browsers block autoplay that has sound, so the picture starts muted and the
 * voice waits behind "Hear Kai". Anyone who ignores it still sees the greeting
 * and is moved along automatically — the site is never held behind the intro.
 */

// Pre-rendered on Higgsfield. Picture and voice are deliberately separate.
const KAI_VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3EbQNf19wFua1cVPa80DiJhKD2X/hf_20260817_040806_d2f95ef5-ad16-4617-82b1-aa12aed414a5.mp4";
const KAI_VOICE_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3EbQNf19wFua1cVPa80DiJhKD2X/hf_20260817_035126_440eb080-e2ab-4fa0-a3e4-ebe4ee8df0eb.wav";
// Shown until the video can paint, and as the fallback if it never loads.
const KAI_POSTER_SRC = "/gallery/hero-trailer.jpg";

const GREETING_TEXT =
  "Hello, I'm Kai — your Sophisticated Sips concierge. Tell me about your event, and I'll help you plan something unforgettable.";

const SEEN_KEY = "ss-kai-intro-v1";
export const INTRO_DONE_EVENT = "ss:kai-intro-done";
export const INTRO_ACTIVE_KEY = "ss-kai-intro-active";

const SILENT_MS = 7000;  // if they never ask for sound, don't hold them long
const MAX_MS = 22000;    // hard ceiling regardless of what stalls

export default function KaiIntro() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
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
    videoRef.current?.pause();
    setLeaving(true);
    try { sessionStorage.removeItem(INTRO_ACTIVE_KEY); } catch {}
    window.dispatchEvent(new CustomEvent(INTRO_DONE_EVENT));
    window.setTimeout(() => setShow(false), 700);
  }, []);

  useEffect(() => {
    if (!show) return;
    const quiet = window.setTimeout(() => { if (!playing) finish(); }, SILENT_MS);
    const ceiling = window.setTimeout(finish, MAX_MS);
    return () => { window.clearTimeout(quiet); window.clearTimeout(ceiling); };
  }, [show, playing, finish]);

  /** Restart picture and voice together so they stay in step. */
  const playGreeting = () => {
    const a = audioRef.current;
    const v = videoRef.current;
    if (!a) return;
    try { a.currentTime = 0; } catch {}
    if (v && !videoFailed) { try { v.currentTime = 0; } catch {} void v.play().catch(() => {}); }
    void a.play().then(() => setPlaying(true)).catch(() => finish());
  };

  if (!show) return null;

  return (
    <div className={`kai-intro ${leaving ? "leaving" : ""}`} role="dialog" aria-label="Welcome from Kai">
      {videoFailed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="kai-intro-still" src={KAI_POSTER_SRC} alt="The Sophisticated Sips mobile espresso trailer at dusk" />
      ) : (
        <video
          ref={videoRef}
          className="kai-intro-video"
          src={KAI_VIDEO_SRC}
          poster={KAI_POSTER_SRC}
          autoPlay
          muted
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
        />
      )}
      <div className="kai-intro-veil" aria-hidden="true" />

      {/* The voice track: the repaired footage carries no audio of its own. */}
      <audio ref={audioRef} src={KAI_VOICE_SRC} preload="auto" onEnded={finish} onError={() => setPlaying(false)} />

      <div className="kai-intro-copy">
        <span className="kai-intro-name">Kai · Your Concierge</span>
        <p>{GREETING_TEXT}</p>
      </div>

      {!playing && <button className="kai-intro-sound" onClick={playGreeting}>🔊 Hear Kai</button>}
      <button className="kai-intro-skip" onClick={finish}>Skip ▸</button>
    </div>
  );
}
