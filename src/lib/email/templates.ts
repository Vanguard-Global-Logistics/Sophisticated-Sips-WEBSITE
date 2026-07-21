/**
 * Reusable, branded, email-client-safe HTML email templates.
 *
 * Pure functions only — no side effects, no network, no dependencies. Every
 * template returns matching subject / html / text so callers (e.g. resend.ts)
 * can hand the pieces straight to the mail provider.
 *
 * Design notes:
 * - Layout uses tables + inline styles only. Email clients strip <style>
 *   blocks and external CSS, so nothing here relies on them.
 * - Brand palette: deep teal #0F3433, espresso #2B1D12, cream #F6EFE3,
 *   champagne gold #C9A45C. Headings use Georgia (web-safe serif) because the
 *   site's custom fonts do not load in mail clients.
 * - Transactional templates (receipt/invoice) deliberately OMIT an unsubscribe
 *   link. Marketing/follow-up templates MUST carry the unsubscribe URL and
 *   postal address in the footer — CAN-SPAM compliance is load-bearing.
 */

export type EmailContent = { subject: string; html: string; text: string };

/** Brand palette, kept local so this file has zero imports. */
const COLORS = {
  teal: "#0F3433",
  espresso: "#2B1D12",
  cream: "#F6EFE3",
  gold: "#C9A45C",
  ink: "#2B1D12",
  muted: "#6B5D4F",
  cardBg: "#FFFFFF",
  pageBg: "#EFE7D8",
} as const;

const HEADING_FONT = "Georgia, 'Times New Roman', Times, serif";
const BODY_FONT = "Helvetica, Arial, sans-serif";

/** Escape interpolated user text to prevent HTML injection. */
function esc(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format integer cents as USD, e.g. 123456 -> "$1,234.56". */
function usd(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = (abs % 100).toString().padStart(2, "0");
  const grouped = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}.${remainder}`;
}

/**
 * Wrap inner HTML in a luxury, inline-styled, email-client-safe shell.
 * `opts.footer` is raw HTML appended below the card (used for compliance
 * footers); it is the caller's responsibility to escape any user text in it.
 */
function layout(inner: string, opts?: { footer?: string }): string {
  const footer = opts?.footer ?? "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>Sophisticated Sips</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.pageBg};-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.pageBg};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td style="padding:0 0 16px 0;text-align:center;font-family:${HEADING_FONT};color:${COLORS.teal};font-size:22px;letter-spacing:0.5px;">
Sophisticated&nbsp;Sips
<div style="font-family:${BODY_FONT};color:${COLORS.muted};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;padding-top:4px;">Luxury Mobile Espresso Catering</div>
</td></tr>
<tr><td style="background-color:${COLORS.gold};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
<tr><td style="background-color:${COLORS.cardBg};border:1px solid #E4D9C4;border-top:none;padding:32px 32px 28px 32px;font-family:${BODY_FONT};color:${COLORS.ink};font-size:16px;line-height:1.6;">
${inner}
</td></tr>
<tr><td style="background-color:${COLORS.cream};border:1px solid #E4D9C4;border-top:none;padding:20px 32px;font-family:${BODY_FONT};color:${COLORS.muted};font-size:12px;line-height:1.6;text-align:center;">
${footer}
<div style="padding-top:8px;">Sophisticated Sips &middot; Luxury mobile espresso catering</div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** A gold-accented heading block for card interiors. */
function h1(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-family:${HEADING_FONT};color:${COLORS.teal};font-size:24px;font-weight:normal;line-height:1.3;">${esc(text)}</h1>`;
}

/** A prominent gold call-to-action button (bulletproof table button). */
function button(label: string, url: string): string {
  const safeUrl = esc(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr>
<td align="center" bgcolor="${COLORS.teal}" style="border-radius:4px;">
<a href="${safeUrl}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:${BODY_FONT};font-size:15px;color:${COLORS.cream};text-decoration:none;border-radius:4px;font-weight:bold;">${esc(label)}</a>
</td></tr></table>`;
}

/** A single label/value line for amount summaries. */
function amountRow(amountCents: number): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;border-top:1px solid #E4D9C4;border-bottom:1px solid #E4D9C4;">
<tr>
<td style="padding:14px 0;font-family:${BODY_FONT};font-size:14px;color:${COLORS.muted};">Amount</td>
<td style="padding:14px 0;font-family:${HEADING_FONT};font-size:22px;color:${COLORS.espresso};text-align:right;">${esc(usd(amountCents))}</td>
</tr></table>`;
}

/** Greeting line: personalised when a name is supplied, warm otherwise. */
function greeting(customerName?: string): string {
  return `<p style="margin:0 0 16px 0;">Hi ${customerName ? esc(customerName) : "there"},</p>`;
}

/** Compliance footer HTML for marketing/follow-up mail (never omit). */
function complianceFooter(unsubscribeUrl: string, postalAddress: string): string {
  return `<div>${esc(postalAddress)}</div>
<div style="padding-top:6px;">You're receiving this because your event was publicly listed or you opted in.</div>
<div style="padding-top:6px;"><a href="${esc(unsubscribeUrl)}" target="_blank" style="color:${COLORS.teal};text-decoration:underline;">Unsubscribe</a> &mdash; we'll never email you again.</div>`;
}

/** Plaintext compliance footer for marketing/follow-up mail. */
function complianceFooterText(unsubscribeUrl: string, postalAddress: string): string {
  return `\n\n—\nSophisticated Sips · Luxury mobile espresso catering\n${postalAddress}\nYou're receiving this because your event was publicly listed or you opted in.\nUnsubscribe (we'll never email you again): ${unsubscribeUrl}`;
}

/**
 * Payment receipt (transactional — NO unsubscribe link).
 */
export function receiptEmail(opts: {
  businessName: string;
  customerName?: string;
  amountCents: number;
  description: string;
  siteUrl?: string;
}): EmailContent {
  const subject = `Your receipt from ${opts.businessName}`;
  const inner = `${h1("Thank you for your payment")}
${greeting(opts.customerName)}
<p style="margin:0 0 8px 0;">We've received your payment. Here are the details for your records:</p>
<p style="margin:0 0 4px 0;color:${COLORS.muted};font-size:14px;">${esc(opts.description)}</p>
${amountRow(opts.amountCents)}
<p style="margin:16px 0 0 0;">We can't wait to bring an exceptional espresso experience to your event.</p>
${opts.siteUrl ? button("Visit our site", opts.siteUrl) : ""}
<p style="margin:16px 0 0 0;">Warmly,<br />${esc(opts.businessName)}</p>`;

  const text = `Thank you for your payment

Hi ${opts.customerName || "there"},

We've received your payment. Here are the details for your records:

${opts.description}
Amount: ${usd(opts.amountCents)}

We can't wait to bring an exceptional espresso experience to your event.
${opts.siteUrl ? `\nVisit our site: ${opts.siteUrl}\n` : ""}
Warmly,
${opts.businessName}`;

  return { subject, html: layout(inner), text };
}

/**
 * Invoice / payment request (transactional — NO unsubscribe link).
 */
export function invoiceEmail(opts: {
  businessName: string;
  customerName?: string;
  amountCents: number;
  dueDate?: string;
  payUrl?: string;
  description: string;
}): EmailContent {
  const subject = `Invoice from ${opts.businessName}`;
  const inner = `${h1("Your invoice")}
${greeting(opts.customerName)}
<p style="margin:0 0 8px 0;">Thank you for choosing ${esc(opts.businessName)}. Here is your invoice:</p>
<p style="margin:0 0 4px 0;color:${COLORS.muted};font-size:14px;">${esc(opts.description)}</p>
${amountRow(opts.amountCents)}
${opts.dueDate ? `<p style="margin:0 0 8px 0;"><strong>Due:</strong> ${esc(opts.dueDate)}</p>` : ""}
${opts.payUrl ? button("Pay invoice", opts.payUrl) : `<p style="margin:16px 0 0 0;">We'll follow up with payment details shortly.</p>`}
<p style="margin:16px 0 0 0;">Warmly,<br />${esc(opts.businessName)}</p>`;

  const text = `Your invoice

Hi ${opts.customerName || "there"},

Thank you for choosing ${opts.businessName}. Here is your invoice:

${opts.description}
Amount: ${usd(opts.amountCents)}
${opts.dueDate ? `Due: ${opts.dueDate}\n` : ""}${opts.payUrl ? `\nPay invoice: ${opts.payUrl}\n` : "\nWe'll follow up with payment details shortly.\n"}
Warmly,
${opts.businessName}`;

  return { subject, html: layout(inner), text };
}

/**
 * Outreach follow-up (marketing — MUST include unsubscribe URL + postal address).
 */
export function followUpEmail(opts: {
  businessName: string;
  customerName?: string;
  eventType?: string;
  bodyIntro?: string;
  unsubscribeUrl: string;
  postalAddress: string;
}): EmailContent {
  const eventPhrase = opts.eventType ? ` for your ${esc(opts.eventType)}` : "";
  const subject = opts.eventType
    ? `Following up${opts.eventType ? ` — ${opts.eventType}` : ""} · ${opts.businessName}`
    : `Following up · ${opts.businessName}`;
  const intro =
    opts.bodyIntro ||
    `I wanted to gently follow up in case an elegant mobile espresso bar${eventPhrase} would be a welcome touch. We'd be honoured to be part of your event.`;
  const inner = `${h1("Just following up")}
${greeting(opts.customerName)}
<p style="margin:0 0 16px 0;">${esc(intro)}</p>
<p style="margin:16px 0 0 0;">Warmly,<br />${esc(opts.businessName)}</p>`;

  const text = `Just following up

Hi ${opts.customerName || "there"},

${intro}

Warmly,
${opts.businessName}${complianceFooterText(opts.unsubscribeUrl, opts.postalAddress)}`;

  return {
    subject,
    html: layout(inner, { footer: complianceFooter(opts.unsubscribeUrl, opts.postalAddress) }),
    text,
  };
}

/**
 * General marketing email (MUST include unsubscribe URL + postal address).
 * `bodyHtml` is caller-supplied trusted HTML for the message body.
 */
export function marketingEmail(opts: {
  businessName: string;
  subject: string;
  bodyHtml: string;
  unsubscribeUrl: string;
  postalAddress: string;
}): EmailContent {
  const inner = `${h1(opts.subject)}
<div style="margin:0;">${opts.bodyHtml}</div>
<p style="margin:20px 0 0 0;">Warmly,<br />${esc(opts.businessName)}</p>`;

  // Strip tags for a best-effort plaintext alternative of the trusted body.
  const bodyText = opts.bodyHtml.replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const text = `${opts.subject}

${bodyText}

Warmly,
${opts.businessName}${complianceFooterText(opts.unsubscribeUrl, opts.postalAddress)}`;

  return {
    subject: opts.subject,
    html: layout(inner, { footer: complianceFooter(opts.unsubscribeUrl, opts.postalAddress) }),
    text,
  };
}
