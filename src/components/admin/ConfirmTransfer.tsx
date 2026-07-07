"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmTransfer() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const confirm = async () => {
    if (!window.confirm("Confirm ownership transfer? You'll gain full owner access to bookings, payments, and customer data.")) return;
    setBusy(true);
    const res = await fetch("/api/owner/transfer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    const data = await res.json();
    setBusy(false);
    setMsg(data.message || data.error || "Something went wrong.");
    if (data.ok) setTimeout(() => { router.push("/owner"); router.refresh(); }, 1200);
  };

  return (
    <>
      <button className="btn btn-gold" onClick={confirm} disabled={busy}>{busy ? "Confirming…" : "Confirm transfer"}</button>
      {msg && <p style={{ marginTop: 14, fontSize: 14 }} role="status">{msg}</p>}
    </>
  );
}
