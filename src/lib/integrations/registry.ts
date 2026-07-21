/** Connection registry — safe status of every third-party integration.
 *
 *  Server-only, but safe to call from a server component to render a
 *  "Connections" panel: it returns ONLY booleans, labels, and notes. No secret
 *  value is ever read out or exposed — presence is checked, never content. */

import type { IntegrationStatus } from "./types";
import { isGoogleConfigured } from "./google";

function hasSquare(): boolean {
  const v = process.env.SQUARE_ACCESS_TOKEN;
  return typeof v === "string" && v.length > 20;
}

function hasResend(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Status of all providers. Google services share a single OAuth credential set
 *  (isGoogleConfigured); the note points to the env vars needed to connect. */
export function integrationStatuses(): IntegrationStatus[] {
  const google = isGoogleConfigured();
  const googleNote = google
    ? undefined
    : "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN to connect.";

  return [
    { id: "google-calendar", label: "Google Calendar", connected: google, category: "google", note: googleNote },
    { id: "gmail", label: "Gmail", connected: google, category: "google", note: googleNote },
    { id: "google-contacts", label: "Google Contacts", connected: google, category: "google", note: googleNote },
    { id: "google-drive", label: "Google Drive", connected: google, category: "google", note: googleNote },
    { id: "google-docs", label: "Google Docs", connected: google, category: "google", note: googleNote },
    { id: "google-maps", label: "Google Maps", connected: google, category: "google", note: googleNote },
    {
      id: "google-reviews",
      label: "Google Reviews",
      connected: google,
      category: "google",
      note: google ? "Also requires GOOGLE_BUSINESS_ACCOUNT_ID." : googleNote,
    },
    {
      id: "google-business-profile",
      label: "Google Business Profile",
      connected: google,
      category: "google",
      note: google ? "Also requires GOOGLE_BUSINESS_ACCOUNT_ID." : googleNote,
    },
    {
      id: "square",
      label: "Square",
      connected: hasSquare(),
      category: "payments",
      note: hasSquare() ? undefined : "Set SQUARE_ACCESS_TOKEN to connect.",
    },
    {
      id: "resend",
      label: "Resend",
      connected: hasResend(),
      category: "email",
      note: hasResend() ? undefined : "Set RESEND_API_KEY to connect.",
    },
    {
      id: "anthropic",
      label: "Anthropic",
      connected: hasAnthropic(),
      category: "ai",
      note: hasAnthropic() ? undefined : "Set ANTHROPIC_API_KEY to connect.",
    },
  ];
}
