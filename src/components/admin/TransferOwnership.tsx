"use client";
import { useState } from "react";

/** Safe transfer panel. Sensitive actions require typed confirmation; everything is audited. */
export default function TransferOwnership({ status, onChange }: { status: any; onChange: () => void }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const t = status.activeTransfer;

  const call = async (action: string, body: any = {}) => {
    setBusy(true);
    const res = await fetch("/api/owner/transfer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const d = await res.json();
    setBusy(false);
    setMsg(d.message || d.error || "Done.");
    onChange();
  };

  const initiate = () => {
    if (!email) { setMsg("Enter the new owner's email first."); return; }
    if (!window.confirm(`Invite ${email} to become an owner? They'll receive a login invitation by email.`)) return;
    call("initiate", { newOwnerEmail: email });
  };

  const complete = () => {
    const typed = window.prompt(`FINAL STEP — this removes YOUR owner access.\n\nType the new owner's email (${t.new_owner_email}) to confirm:`);
    if (typed?.trim().toLowerCase() !== t.new_owner_email) { setMsg("Email didn't match — transfer not completed."); return; }
    call("complete");
  };

  return (
    <div className="glass">
      <h3>Transfer ownership</h3>
      {!t && (
        <>
          <p style={{ margin: "8px 0 14px", fontSize: 14 }}>
            Selling the business or adding a backup admin? Invite them here. The handover is three safe steps:
            you invite → they confirm → you complete. You keep full access until the final step, and the system
            can never end up with zero owners.
          </p>
          <div className="field">
            <label htmlFor="to-email">New owner's email</label>
            <input id="to-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="new-owner@example.com" />
          </div>
          <button className="btn btn-gold" style={{ width: "100%" }} disabled={busy} onClick={initiate}>Invite new owner</button>
        </>
      )}
      {t && (
        <div style={{ fontSize: 14.5, lineHeight: 1.8 }}>
          <p><b>Transfer in progress</b> → {t.new_owner_email}</p>
          <p>Status: <span className={`badge ${t.status === "confirmed" ? "b-hot" : "b-new"}`}>{t.status}</span></p>
          {t.status === "pending" && <p style={{ opacity: .75, marginTop: 8 }}>Waiting for them to accept the login invite, sign in, and confirm at /owner/transfer.</p>}
          {t.status === "confirmed" && (
            <>
              <p style={{ opacity: .75, margin: "8px 0 14px" }}>They've confirmed and now have owner access. Complete the handover to remove your own access — or leave both accounts active as owner + backup admin.</p>
              <button className="btn btn-gold" disabled={busy} onClick={complete}>Complete transfer (remove my access)</button>
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <button className="mini-btn" disabled={busy} onClick={() => window.confirm("Cancel this transfer?") && call("cancel")}>Cancel transfer</button>
          </div>
        </div>
      )}
      {msg && <p style={{ marginTop: 14, fontSize: 13.5 }} role="status">{msg}</p>}
      <p style={{ marginTop: 14, fontSize: 12, opacity: .55 }}>
        After a completed sale, the technical handover continues in TRANSFER.md: rotate every API key,
        change the OWNER_EMAIL env var, and move the GitHub/Vercel/Supabase/Square/Resend accounts.
      </p>
    </div>
  );
}
