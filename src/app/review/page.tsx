import Link from "next/link";

// The QR and NFC review cards all point here (https://www.sophisticatedsips.net/review).
// To change where reviews go, edit the two links below. No card ever needs reprinting.
const YELP_REVIEW = "https://www.yelp.com/writeareview/biz/sophisticated-sips-new-port-richey";
// Add the Google review link here once the Google Business Profile is verified, then set to a real URL.
const GOOGLE_REVIEW: string | null = null;

export const metadata = {
  title: "Leave a Review | Sophisticated Sips",
  description: "Loved your drink? Tell us how we did. It takes one minute and means the world to our family business.",
  alternates: { canonical: "/review" },
  robots: { index: false, follow: false },
};

export default function ReviewPage() {
  return (
    <div className="lux-page">
      <section className="lux-section lux-section--deep">
        <div className="wrap lux-copy" style={{ maxWidth: 640, textAlign: "center" }}>
          <p className="lux-kicker">Thank you for stopping by</p>
          <h1 className="lux-title" style={{ fontSize: "clamp(34px,6vw,56px)", margin: "10px 0 18px" }}>
            How did we do?
          </h1>
          <p>
            Sophisticated Sips is a family-owned business. A short, honest review helps neighbors find
            us. Thank you for taking a minute.
          </p>
          <div className="lux-actions" style={{ justifyContent: "center", flexWrap: "wrap" }}>
            {GOOGLE_REVIEW && (
              <a className="btn btn-lux btn-gold" href={GOOGLE_REVIEW} target="_blank" rel="noopener noreferrer">
                Review us on Google
              </a>
            )}
            <a className="btn btn-lux btn-gold" href={YELP_REVIEW} target="_blank" rel="noopener noreferrer">
              Review us on Yelp
            </a>
          </div>
          <p style={{ marginTop: 28 }}>
            <Link href="/" style={{ color: "#edcc83" }}>Back to sophisticatedsips.net</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
