"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/database/supabase-browser";

export default function OwnerResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  useEffect(() => {
    const sb = supabaseBrowser();
    let mounted = true;
    const checkSession = async () => {
      const { data } = await sb.auth.getSession();
      if (mounted) setReady(Boolean(data.session));
    };
    void checkSession();
    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (mounted && (event === "PASSWORD_RECOVERY" || session)) setReady(true);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async () => {
    setErr("");
    if (password.length < 12) {
      setErr("Use at least 12 characters for the new password.");
      return;
    }
    if (password !== confirmation) {
      setErr("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const request = sb.auth.updateUser({ password });
      const timeout = new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Password update timed out.")), 15000)
      );
      const { error } = await Promise.race([request, timeout]);
      if (error) {
        setErr("The recovery link is invalid or expired. Request a new reset email.");
        return;
      }
      router.replace("/owner");
      router.refresh();
    } catch {
      setErr("The password service did not respond. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 420 }}>
        <div className="sec-head">
          <div className="sec-kicker">Owner security</div>
          <h1 className="sec-title serif">Choose a new password</h1>
          <p className="sec-sub">Use the secure link from your reset email.</p>
        </div>
        <div className="glass" style={{ padding: 28 }}>
          {!ready && (
            <div className="form-error" role="alert" style={{ marginBottom: 16 }}>
              Open this page from the latest password-reset email. If the link expired, return to owner login and request another.
            </div>
          )}
          <div className="field"><label>New password</label>
            <input type="password" autoComplete="new-password" value={password} disabled={!ready || busy}
              onChange={(event) => setPassword(event.target.value)} /></div>
          <div className="field"><label>Confirm new password</label>
            <input type="password" autoComplete="new-password" value={confirmation} disabled={!ready || busy}
              onChange={(event) => setConfirmation(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && ready && updatePassword()} /></div>
          {err && <div className="form-error" role="alert">{err}</div>}
          <button className="btn btn-gold" style={{ width: "100%" }} onClick={updatePassword} disabled={!ready || busy}>
            {busy ? "Updating password…" : "Update password"}
          </button>
        </div>
      </div>
    </div>
  );
}
