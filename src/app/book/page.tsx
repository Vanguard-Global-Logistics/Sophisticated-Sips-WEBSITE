import BookingForm from "@/components/public/BookingForm";
import { supabaseServer } from "@/lib/database/supabase-server";

export const metadata = {
  title: "Book a Mobile Espresso Trailer | Sophisticated Sips",
  description: "Request a quote for your wedding, corporate event or party. Tell us your date, location and guest count and Amy will reply personally with a custom quote.",
  alternates: { canonical: "/book" },
  openGraph: { title: "Book a Mobile Espresso Trailer | Sophisticated Sips", description: "Request a quote for your wedding, corporate event or party. Tell us your date, location and guest count and Amy will reply personally with a custom quote.", url: "/book", type: "website", siteName: "Sophisticated Sips" },
};

export const revalidate = 300;

type Appearance = {
  location_name: string;
  address: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
};

// "9:00 AM" -> "09:00:00". Falls back to a sensible default if the stored
// text doesn't parse, rather than emitting an invalid schema block.
function to24Hour(timeText: string | null, fallback: string): string {
  if (!timeText) return fallback;
  const m = timeText.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!m) return fallback;
  let hour = parseInt(m[1], 10);
  const minute = m[2];
  const isPM = m[3].toUpperCase() === "PM";
  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}:00`;
}

// Florida (Pasco/Tampa Bay) is America/New_York; every currently-scheduled
// appearance falls in EST, so a fixed -05:00 offset is correct here. If a
// summer-dated appearance is ever added, this needs real DST handling.
function toIsoDateTime(date: string, time24: string): string {
  return `${date}T${time24}-05:00`;
}

async function upcomingAppearances(): Promise<Appearance[]> {
  const sb = await supabaseServer();
  if (!sb) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from("public_appearances")
    .select("location_name,address,event_date,start_time,end_time")
    .eq("active", true)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(20);
  return data || [];
}

export default async function Book() {
  const appearances = await upcomingAppearances();
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sophisticatedsips.net").replace(/\/$/, "");

  const eventGraph = appearances.length > 0 ? {
    "@context": "https://schema.org",
    "@graph": appearances.map((a) => ({
      "@type": "Event",
      name: `Sophisticated Sips Mobile Espresso Trailer — ${a.location_name}`,
      startDate: toIsoDateTime(a.event_date, to24Hour(a.start_time, "09:00:00")),
      endDate: toIsoDateTime(a.event_date, to24Hour(a.end_time, "17:00:00")),
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: a.location_name,
        address: a.address || "New Port Richey, FL",
      },
      organizer: {
        "@type": "Organization",
        name: "Sophisticated Sips",
        url: base,
      },
      offers: {
        "@type": "Offer",
        url: `${base}/book`,
        availability: "https://schema.org/InStock",
        price: "0",
        priceCurrency: "USD",
      },
    })),
  } : null;

  return (
    <div className="lux-page">
      {eventGraph && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventGraph) }} />
      )}

      <header className="lux-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="lux-hero__media"
          src="/branding/catering/Catering-Luxury.jpeg"
          alt=""
          style={{ objectPosition: "center 51%" }}
        />
        <div className="lux-hero__shade" />
        <div className="lux-hero__content">
          <p className="lux-kicker">Reserve your Sophisticated Sips experience</p>
          <h1>Your event,<br />beautifully served</h1>
          <span className="lux-script">coffee, crepes & unforgettable moments.</span>
          <p className="lux-lead">
            Share the essentials now. Amy will review your request personally and prepare a custom quote.
          </p>
        </div>
      </header>

      <section className="lux-section lux-section--deep">
        <div className="wrap lux-form-layout">
          <div className="lux-form-intro">
            <p className="lux-kicker">Two minutes to begin</p>
            <h2>Tell us about your event</h2>
            <p>
              Your date, location, guest count, and vision are enough to start. Amy will follow up
              with the best-fit experience and any helpful questions.
            </p>
            <div className="lux-form-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/kai-cinematic-concierge.jpg" alt="Kai, the Sophisticated Sips AI Concierge, ready to help plan an event" />
            </div>
          </div>
          <div className="lux-form-shell">
            <BookingForm />
          </div>
        </div>
      </section>
    </div>
  );
}
