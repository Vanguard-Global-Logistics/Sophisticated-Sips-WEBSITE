/** Typed domain models and capability interfaces for each Google service used
 *  by Sophisticated Sips. Server-only. Models are kept minimal but realistic
 *  for a luxury mobile-espresso catering business (events, client contacts,
 *  proposals/docs, service-area distances, and reputation). */

/* ---------- Calendar (event scheduling for catering bookings) ---------- */

export type CalendarEvent = {
  id?: string;
  /** Short title, e.g. "Espresso bar — Lavold wedding". */
  summary: string;
  description?: string;
  /** Venue address or place name. */
  location?: string;
  /** ISO-8601 start/end timestamps. */
  start: string;
  end: string;
  attendees?: string[];
};

export interface CalendarAdapter {
  listEvents(range: { from: string; to: string }): Promise<CalendarEvent[]>;
  createEvent(event: CalendarEvent): Promise<CalendarEvent>;
  updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteEvent(id: string): Promise<void>;
}

/* ---------- Gmail (owner-side transactional / follow-up mail) ---------- */

export type GmailMessage = {
  to: string;
  subject: string;
  /** Plain-text or HTML body. */
  body: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
};

export type GmailThreadSummary = {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  updatedAt: string;
};

export interface GmailAdapter {
  sendMessage(message: GmailMessage): Promise<{ id: string; threadId: string }>;
  listThreads(query?: string): Promise<GmailThreadSummary[]>;
}

/* ---------- Contacts (client / lead address book) ---------- */

export type Contact = {
  resourceName?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
};

export interface ContactsAdapter {
  listContacts(query?: string): Promise<Contact[]>;
  upsertContact(contact: Contact): Promise<Contact>;
}

/* ---------- Drive (proposals, contracts, invoices) ---------- */

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
};

export interface DriveAdapter {
  listFiles(folderId?: string): Promise<DriveFile[]>;
  uploadFile(file: {
    name: string;
    mimeType: string;
    content: Uint8Array | string;
    folderId?: string;
  }): Promise<DriveFile>;
}

/* ---------- Docs (auto-generated proposals) ---------- */

export type GoogleDoc = {
  id: string;
  title: string;
  webViewLink?: string;
};

export interface DocsAdapter {
  createDoc(title: string): Promise<GoogleDoc>;
  appendText(docId: string, text: string): Promise<void>;
}

/* ---------- Maps (service-area / travel-fee calculations) ---------- */

export type GeoPoint = { lat: number; lng: number; formattedAddress?: string };

export interface MapsAdapter {
  geocode(address: string): Promise<GeoPoint>;
  distanceMiles(origin: string, destination: string): Promise<number>;
}

/* ---------- Reviews / Business Profile (reputation) ---------- */

export type Review = {
  id: string;
  author: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

export interface ReviewsAdapter {
  listReviews(): Promise<Review[]>;
}

export type BusinessProfile = {
  name: string;
  phone?: string;
  website?: string;
  address?: string;
  description?: string;
};

export interface BusinessProfileAdapter {
  getProfile(): Promise<BusinessProfile>;
  updateProfile(patch: Partial<BusinessProfile>): Promise<BusinessProfile>;
}
