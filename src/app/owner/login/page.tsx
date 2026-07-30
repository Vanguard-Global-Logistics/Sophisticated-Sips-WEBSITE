"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/database/supabase-browser";

export default function OwnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [configurationMissing, setConfigurationMissing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setConfigurationMissing(new URLSearchParams(window.location.search).get("configuration") === "missing");
  }, []);

  const login = async () => {
    if (configurationMissing) {
      setErr("This deployment is missing its Supabase environment configuration. The site owner must correct the Vercel project settings before sign-in can work.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const signIn = sb.auth.signInWithPassword({ email, password });
      const timeout = new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Sign-in timed out.")), 15000)
      );
      const { error } = await Promise.race([signIn, timeout]);
      if (error) {
        setErr("That login didn't work — check your email and password.");
        return;
      }
      router.replace("/owner");
      router.refresh();
    } catch {
      setErr("The sign-in service did not respond. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    setErr("");
    setNotice("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErr("Enter the owner email address first.");
      return;
    }
    setResetBusy(true);
    try {
      const sb = supabaseBrowser();
      const request = sb.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/owner/reset-password`,
      });
      const timeout = new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Reset request timed out.")), 15000)
      );
      const { error } = await Promise.race([request, timeout]);
      if (error) {
        setErr("The reset email could not be sent. Please try again.");
        return;
      }
      setNotice("Check your email for a secure password-reset link. It may take a few minutes.");
    } catch {
      setErr("The password-reset service did not respond. Please try again.");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 420 }}>
        <div className="sec-head">
          <div className="sec-kicker">Owner access</div>
          <h1 className="sec-title serif">Welcome back</h1>
          <p className="sec-sub">This dashboard is private to Sophisticated Sips.</p>
        </div>
        <form className="glass" style={{ padding: 28 }} onSubmit={(event) => { event.preventDefault(); void login(); }}>
          {configurationMissing && (
            <div className="form-error" role="alert" style={{ marginBottom: 16 }}>
              This deployment is not connected to Supabase. The dashboard is safe, but it cannot accept owner sign-ins until the Vercel environment configuration is restored.
            </div>
          )}
          <div className="field"><label htmlFor="owner-email">Email</label>
            <input id="owner-email" name="email" type="email" autoComplete="email" required value={email} disabled={configurationMissing} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()} /></div>
          <div className="field"><label htmlFor="owner-password">Password</label>
            <input id="owner-password" name="password" type="password" autoComplete="current-password" required value={password} disabled={configurationMissing} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()} /></div>
          {err && <div className="form-error" role="alert">{err}</div>}
          {notice && <div className="form-success" role="status" style={{ marginBottom: 14 }}>{notice}</div>}
          <button type="submit" className="btn btn-gold" style={{ width: "100%" }} disabled={busy || resetBusy || configurationMissing}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: 10 }}
            onClick={requestPasswordReset}
            disabled={busy || resetBusy || configurationMissing}
          >
            {resetBusy ? "Sending reset email…" : "Forgot password?"}
          </button>
        </form>
      </div>
    </div>
  );
}
