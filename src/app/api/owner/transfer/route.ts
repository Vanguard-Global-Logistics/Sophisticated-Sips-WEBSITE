import { NextResponse } from "next/server";
import { ownerEmail, supabaseAdmin, supabaseServer } from "@/lib/database/supabase-server";
import { logAdmin } from "@/lib/database/audit";

export const runtime = "nodejs";

/** Safe ownership transfer:
 *  1. initiate  — current owner invites new owner (Supabase auth invite email + pending request)
 *  2. confirm   — NEW owner, signed in themselves, confirms → added to owners table
 *  3. complete  — CURRENT owner demotes themselves → removed from owners table
 *  The DB trigger `owners_min` makes zero-owner states impossible, and the OWNER_EMAIL
 *  env var must be rotated afterwards (TRANSFER.md) since it is a break-glass owner. */
export async function POST(req: Request) {
  const { action, newOwnerEmail } = await req.json().catch(() => ({}));
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ error: "Service not configured yet." }, { status: 503 });

  // "confirm" is special: the invited new owner is NOT in the owners table yet,
  // so it authorizes against the signed-in SESSION email matching the invitation.
  if (action === "confirm") {
    const sb = await supabaseServer();
    const { data: userData } = await sb.auth.getUser();
    const sessionEmail = userData.user?.email?.toLowerCase();
    if (!sessionEmail) return NextResponse.json({ error: "Sign in first with your invited email." }, { status: 401 });

    const { data: reqRow } = await db.from("owner_transfer_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!reqRow) return NextResponse.json({ error: "No pending transfer to confirm." }, { status: 404 });
    if (reqRow.new_owner_email !== sessionEmail)
      return NextResponse.json({ error: `This transfer is for ${reqRow.new_owner_email}; you're signed in as ${sessionEmail}.` }, { status: 403 });

    await db.from("owners").upsert({ email: sessionEmail });
    await db.from("owner_transfer_requests").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", reqRow.id);
    await logAdmin(sessionEmail, "transfer.confirm", `request ${reqRow.id}`);
    return NextResponse.json({ ok: true, message: "Confirmed — you now have owner access. The previous owner completes the handover from their dashboard." });
  }

  const actor = await ownerEmail();
  if (!actor) return NextResponse.json({ error: "owner only" }, { status: 401 });

  if (action === "initiate") {
    const email = String(newOwnerEmail || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return NextResponse.json({ error: "Enter a valid email for the new owner." }, { status: 400 });
    if (email === actor)
      return NextResponse.json({ error: "That's already you." }, { status: 400 });
    const { data: existing } = await db.from("owner_transfer_requests").select("id").in("status", ["pending", "confirmed"]).maybeSingle();
    if (existing)
      return NextResponse.json({ error: "A transfer is already in progress — cancel it first." }, { status: 409 });

    // Create their login (Supabase sends the invite email). If they already have an account, that's fine.
    const invite = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/owner/login`,
    });
    const alreadyHadAccount = !!invite.error;

    const { data: reqRow, error } = await db.from("owner_transfer_requests")
      .insert({ current_owner_email: actor, new_owner_email: email })
      .select("id").single();
    if (error) return NextResponse.json({ error: "Couldn't create the transfer request." }, { status: 500 });

    await logAdmin(actor, "transfer.initiate", `→ ${email}${alreadyHadAccount ? " (account already existed)" : " (invite email sent)"}`);
    return NextResponse.json({
      ok: true, requestId: reqRow.id,
      message: alreadyHadAccount
        ? `${email} already has a login. Ask them to sign in at /owner/login and confirm the transfer.`
        : `Invite email sent to ${email}. Once they set a password and sign in, they'll confirm the transfer here.`,
    });
  }

  if (action === "complete") {
    const { data: reqRow } = await db.from("owner_transfer_requests").select("*").eq("status", "confirmed").order("confirmed_at", { ascending: false }).limit(1).maybeSingle();
    if (!reqRow) return NextResponse.json({ error: "No confirmed transfer to complete — the new owner must confirm first." }, { status: 404 });
    if (reqRow.current_owner_email !== actor)
      return NextResponse.json({ error: "Only the outgoing owner can complete the transfer." }, { status: 403 });

    const { error: delErr } = await db.from("owners").delete().eq("email", actor);
    if (delErr) // the never-zero-owners trigger also protects here
      return NextResponse.json({ error: `Couldn't demote: ${delErr.message}` }, { status: 409 });

    await db.from("owner_transfer_requests").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", reqRow.id);
    await logAdmin(actor, "transfer.complete", `ownership → ${reqRow.new_owner_email}`);
    return NextResponse.json({ ok: true, message: `Done. ${reqRow.new_owner_email} is now the owner. Final step: rotate OWNER_EMAIL and all keys per TRANSFER.md.` });
  }

  if (action === "cancel") {
    const { data: reqRow } = await db.from("owner_transfer_requests").select("*").in("status", ["pending", "confirmed"]).maybeSingle();
    if (!reqRow) return NextResponse.json({ error: "No active transfer." }, { status: 404 });
    await db.from("owner_transfer_requests").update({ status: "canceled" }).eq("id", reqRow.id);
    await logAdmin(actor, "transfer.cancel", `request ${reqRow.id} (was → ${reqRow.new_owner_email})`);
    return NextResponse.json({ ok: true, message: "Transfer canceled." });
  }

  return NextResponse.json({ error: "action must be initiate, confirm, complete, or cancel" }, { status: 400 });
}
