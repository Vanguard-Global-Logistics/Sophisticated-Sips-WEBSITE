"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/database/supabase-browser";

export default function OwnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const login = async () => {
    setErr(""); setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr("That login didn't work — check your email and password."); return; }
    router.push("/owner");
    router.refresh();
  };

  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 420 }}>
        <div className="sec-head">
          <div className="sec-kicker">Owner access</div>
          <h1 className="sec-title serif">Welcome back, Amy</h1>
          <p className="sec-sub">This dashboard is private to Sophisticated Sips.</p>
        </div>
        <div className="glass" style={{ padding: 28 }}>
          <div className="field"><label>Email</label>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()} /></div>
          <div className="field"><label>Password</label>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()} /></div>
          {err && <div className="form-error">{err}</div>}
          <button className="btn btn-gold" style={{ width: "100%" }} onClick={login} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
