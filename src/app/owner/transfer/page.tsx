import { redirect } from "next/navigation";
import { requireOwner, supabaseServer, supabaseAdmin } from "@/lib/database/supabase-server";
import ConfirmTransfer from "@/components/admin/ConfirmTransfer";

export const metadata = { title: "Ownership Transfer — Sophisticated Sips" };
export const dynamic = "force-dynamic";

export default async function TransferPage() {
  if (await requireOwner()) redirect("/owner"); // existing owners manage transfers from the dashboard

  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) redirect("/owner/login");

  const { data: reqRow } = await supabaseAdmin()
    .from("owner_transfer_requests").select("new_owner_email,status")
    .eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();

  const invited = reqRow?.new_owner_email === email;
  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 480 }}>
        <div className="sec-head">
          <div className="sec-kicker">Ownership</div>
          <h1 className="sec-title serif">{invited ? "Confirm your ownership" : "No access"}</h1>
        </div>
        <div className="glass" style={{ padding: 28, textAlign: "center" }}>
          {invited ? (
            <>
              <p className="sec-sub" style={{ marginBottom: 22 }}>
                You&apos;ve been invited to take ownership of the Sophisticated Sips platform.
                Confirming gives this account ({email}) full owner access.
              </p>
              <ConfirmTransfer />
            </>
          ) : (
            <p className="sec-sub">
              This account ({email}) doesn&apos;t have owner access and no transfer is pending for it.
              If you believe this is a mistake, contact the current owner.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
