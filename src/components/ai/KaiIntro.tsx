"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * KaiIntro — Kai's pre-rendered welcome, played full-screen when a visitor lands.
 *
 * Same shape as jarvis-web's intro: autoplay, a always-available Skip, fade to the
 * site when it ends, and a replay affordance. Shown once per browser session so
 * returning visitors are not made to sit through it again.
 *
 * Browsers block autoplay that has sound, so it starts muted with a visible
 * "Tap for sound" control — the first tap unmutes and restarts from the top so
 * nothing of the greeting is missed.
 */

// Pre-rendered on Higgsfield and served from their CDN. Swap this one line to
// replace the greeting; nothing else needs to change.
const KAI_INTRO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3EbQNf19wFua1cVPa80DiJhKD2X/hf_20260817_033054_99f37a32-0554-4c9a-8692-5f0d05b25650.mp4";

const SEEN_KEY = "ss-kai-intro-v1";
export const INTRO_DONE_EVENT = "ss:kai-intro-done";
export const INTRO_ACTIVE_KEY = "ss-kai-intro-active";

export default function KaiIntro() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
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
    setLeaving(true);
    try { sessionStorage.removeItem(INTRO_ACTIVE_KEY); } catch {}
    window.dispatchEvent(new CustomEvent(INTRO_DONE_EVENT));
    window.setTimeout(() => setShow(false), 700);
  }, []);

  // Safety net: never trap a visitor behind the overlay if the file stalls.
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(finish, 20000);
    return () => window.clearTimeout(t);
  }, [show, finish]);

  // If the video can't load at all, get out of the way immediately.
  useEffect(() => {
    if (failed) finish();
  }, [failed, finish]);

  const unmute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    setMuted(false);
    try { v.currentTime = 0; } catch {}
    void v.play().catch(() => {});
  };

  if (!show) return null;

  return (
    <div className={`kai-intro ${leaving ? "leaving" : ""}`} role="dialog" aria-label="Welcome from Kai">
      <video
        ref={videoRef}
        className="kai-intro-video"
        src={KAI_INTRO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={() => setFailed(true)}
      />
      <div className="kai-intro-veil" aria-hidden="true" />
      {muted && (
        <button className="kai-intro-sound" onClick={unmute}>
          🔊 Tap for sound
        </button>
      )}
      <button className="kai-intro-skip" onClick={finish}>Skip intro ▸</button>
    </div>
  );
}
