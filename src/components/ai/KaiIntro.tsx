"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * KaiIntro — Kai's welcome, played full-screen when a visitor lands.
 *
 * Browsers block autoplay that has sound, so it starts muted behind a visible
 * "Hear Kai" control; tapping unmutes and restarts from the top so none of the
 * greeting is missed. Anyone who ignores it still sees the picture and is moved
 * along automatically — the site is never held behind the intro.
 */

// One file carrying both streams: the lip-sync repair returned picture only,
// so Kai's voice was muxed onto it with ffmpeg (video copied untouched).
// Verified as h264 video + aac stereo audio before being wired up here.
const KAI_VIDEO_SRC =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_3EbQNf19wFua1cVPa80DiJhKD2X/53c5ddea-107d-4787-9177-f8c46d178a82.mp4";
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

  /** Unmute and restart from the top so none of the greeting is missed. */
  const playGreeting = () => {
    const v = videoRef.current;
    if (!v || videoFailed) return;
    v.muted = false;
    v.volume = 1;
    try { v.currentTime = 0; } catch {}
    void v.play().then(() => setPlaying(true)).catch(() => finish());
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
          onEnded={finish}
          onError={() => setVideoFailed(true)}
        />
      )}
      <div className="kai-intro-veil" aria-hidden="true" />

      <div className="kai-intro-copy">
        <span className="kai-intro-name">Kai · Your Concierge</span>
        <p>{GREETING_TEXT}</p>
      </div>

      {!playing && <button className="kai-intro-sound" onClick={playGreeting}>🔊 Hear Kai</button>}
      <button className="kai-intro-skip" onClick={finish}>Skip ▸</button>
    </div>
  );
}
