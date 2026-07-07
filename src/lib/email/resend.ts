import { Resend } from "resend";
import { makeUnsubToken } from "./unsubscribe";

const isStaging = () => process.env.NEXT_PUBLIC_APP_ENV !== "production";
/** In staging, every email is rerouted to the owner so no real recipient is ever contacted. */
function stagingReroute(to: string, subject: string) {
  if (!isStaging()) return { to, subject };
  return {
    to: process.env.OWNER_EMAIL || to,
    subject: `[STAGING — would have gone to ${to}] ${subject}`,
  };
}

const resend = () => new Resend(process.env.RESEND_API_KEY!);

/** Sends an approved outreach email with a compliant opt-out footer. */
export async function sendOutreachEmail(opts: { to: string; subject: string; body: string }) {
  const unsubUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/outreach/unsubscribe?token=${makeUnsubToken(opts.to)}`;
  const footer =
    `\n\n—\nSophisticated Sips · Luxury mobile espresso catering\n` +
    `${process.env.BUSINESS_ADDRESS || "Florida, USA"}\n` +
    `You're receiving this one-time business inquiry because your event was publicly listed.\n` +
    `Unsubscribe (we'll never email you again): ${unsubUrl}`;
  const routed = stagingReroute(opts.to, opts.subject);
  const { error } = await resend().emails.send({
    from: process.env.OUTREACH_FROM!,
    to: routed.to,
    subject: routed.subject,
    text: opts.body + footer,
    headers: { "List-Unsubscribe": `<${unsubUrl}>` },
  });
  if (error) throw new Error(error.message);
}

/** Booking confirmation to the customer (transactional, no unsubscribe needed). */
export async function sendBookingReceipt(to: string, name: string) {
  try {
    const routed = stagingReroute(to, "We received your event request — Sophisticated Sips");
    await resend().emails.send({
      from: process.env.OUTREACH_FROM!,
      to: routed.to,
      subject: routed.subject,
      text: `Hi ${name},\n\nThank you — Sophisticated Sips has received your event request. Amy will review it personally and respond with a quote shortly.\n\nWarmly,\nSophisticated Sips`,
    });
  } catch { /* non-fatal */ }
}
