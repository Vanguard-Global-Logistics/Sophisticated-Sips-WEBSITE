import BookingForm from "@/components/public/BookingForm";

export const metadata = {
  title: "Book the Trailer — Sophisticated Sips",
  description: "Request Sophisticated Sips luxury mobile espresso and crepe catering for your event.",
};

export default function Book() {
  return (
    <div className="lux-page">
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
              <img src="/gallery/signature-drinks.jpg" alt="Sophisticated Sips signature iced drinks" />
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
