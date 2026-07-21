/** Google integration adapters — NOT CONNECTED.
 *
 *  Server-only. Every factory below returns a stub whose methods throw
 *  NotConnectedError, so importing this module never crashes and callers get a
 *  clear, actionable error instead of an opaque failure.
 *
 *  TO CONNECT (future engineer): add these server-only env vars, then replace
 *  each stub with a real OAuth-backed implementation. Keep them out of any
 *  "use client" file — they must never reach the browser.
 *
 *    GOOGLE_CLIENT_ID          OAuth 2.0 client id
 *    GOOGLE_CLIENT_SECRET      OAuth 2.0 client secret
 *    GOOGLE_REFRESH_TOKEN      long-lived refresh token for the owner account
 *    GOOGLE_CALENDAR_ID        target calendar (defaults to "primary" if unset)
 *    GOOGLE_BUSINESS_ACCOUNT_ID  account id for Business Profile / Reviews APIs
 *
 *  isGoogleConfigured() gates the first three (the credentials required for any
 *  Google call). The last two are per-feature and validated where used. */

import { NotConnectedError } from "../types";
import type {
  BusinessProfile,
  BusinessProfileAdapter,
  CalendarAdapter,
  CalendarEvent,
  Contact,
  ContactsAdapter,
  DocsAdapter,
  DriveAdapter,
  DriveFile,
  GmailAdapter,
  GmailMessage,
  GmailThreadSummary,
  GoogleDoc,
  GeoPoint,
  MapsAdapter,
  Review,
  ReviewsAdapter,
} from "./types";

/** Core OAuth env vars needed before any Google API call can succeed. */
export const GOOGLE_CORE_ENV = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
] as const;

/** True only when all core OAuth credentials are present (server-side). No
 *  secret value is returned or logged — presence is checked, not content. */
export function isGoogleConfigured(): boolean {
  return GOOGLE_CORE_ENV.every((k) => {
    const v = process.env[k];
    return typeof v === "string" && v.length > 0;
  });
}

/** Build a stub method that always rejects with a NotConnectedError naming the
 *  provider label and the env vars still required to connect it. */
function notConnected(label: string, extraEnv: string[] = []): () => Promise<never> {
  const required = [...GOOGLE_CORE_ENV, ...extraEnv];
  return () => Promise.reject(new NotConnectedError(label, required));
}

export function getCalendar(): CalendarAdapter {
  const fail = notConnected("Google Calendar", ["GOOGLE_CALENDAR_ID"]);
  return {
    listEvents: fail as () => Promise<CalendarEvent[]>,
    createEvent: fail as () => Promise<CalendarEvent>,
    updateEvent: fail as () => Promise<CalendarEvent>,
    deleteEvent: fail as () => Promise<void>,
  };
}

export function getGmail(): GmailAdapter {
  const fail = notConnected("Gmail");
  return {
    sendMessage: fail as () => Promise<{ id: string; threadId: string }>,
    listThreads: fail as () => Promise<GmailThreadSummary[]>,
  };
}

export function getContacts(): ContactsAdapter {
  const fail = notConnected("Google Contacts");
  return {
    listContacts: fail as () => Promise<Contact[]>,
    upsertContact: fail as () => Promise<Contact>,
  };
}

export function getDrive(): DriveAdapter {
  const fail = notConnected("Google Drive");
  return {
    listFiles: fail as () => Promise<DriveFile[]>,
    uploadFile: fail as () => Promise<DriveFile>,
  };
}

export function getDocs(): DocsAdapter {
  const fail = notConnected("Google Docs");
  return {
    createDoc: fail as () => Promise<GoogleDoc>,
    appendText: fail as () => Promise<void>,
  };
}

export function getMaps(): MapsAdapter {
  const fail = notConnected("Google Maps");
  return {
    geocode: fail as () => Promise<GeoPoint>,
    distanceMiles: fail as () => Promise<number>,
  };
}

export function getReviews(): ReviewsAdapter {
  const fail = notConnected("Google Reviews", ["GOOGLE_BUSINESS_ACCOUNT_ID"]);
  return {
    listReviews: fail as () => Promise<Review[]>,
  };
}

export function getBusinessProfile(): BusinessProfileAdapter {
  const fail = notConnected("Google Business Profile", ["GOOGLE_BUSINESS_ACCOUNT_ID"]);
  return {
    getProfile: fail as () => Promise<BusinessProfile>,
    updateProfile: fail as () => Promise<BusinessProfile>,
  };
}
