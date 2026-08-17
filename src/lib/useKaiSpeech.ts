"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reads Kai's replies aloud using the browser's built-in speech engine.
 *
 * Deliberately not a paid text-to-speech call: this runs on-device, costs
 * nothing per reply, and starts instantly. That trade is right for the owner
 * dashboard, where Amy wants to hear an answer while her hands are busy and
 * there is no avatar to lip-sync against.
 *
 * Off by default and remembered per browser — speech that starts on its own
 * is startling, and Amy is often working next to customers.
 */

const PREF_KEY = "ss-kai-speak-v1";

/** Closest match to Kai: a British male voice, else any British voice, else the default. */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const british = voices.filter((v) => /en[-_]GB/i.test(v.lang));
  const maleish = british.find((v) => /male|daniel|arthur|george|oliver/i.test(v.name));
  return maleish ?? british[0] ?? voices.find((v) => /^en/i.test(v.lang)) ?? voices[0];
}

export function useKaiSpeech() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    try { setEnabledState(localStorage.getItem(PREF_KEY) === "1"); } catch {}

    // Voices load asynchronously in most browsers, so resolve on both paths.
    const load = () => { voiceRef.current = pickVoice(window.speechSynthesis.getVoices()); };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try { localStorage.setItem(PREF_KEY, next ? "1" : "0"); } catch {}
    if (!next) stop();
  }, [stop]);

  const speak = useCallback((text: string) => {
    if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const clean = text.replace(/[*_#`]/g, "").trim();
    if (!clean) return;
    window.speechSynthesis.cancel(); // never let two replies overlap
    const utter = new SpeechSynthesisUtterance(clean);
    if (voiceRef.current) utter.voice = voiceRef.current;
    utter.rate = 1.02;
    utter.pitch = 0.95;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [enabled]);

  return { supported, enabled, setEnabled, speak, stop, speaking };
}
