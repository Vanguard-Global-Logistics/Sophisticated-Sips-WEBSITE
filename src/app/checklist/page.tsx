import Link from "next/link";
import ChecklistForm from "@/components/public/ChecklistForm";

export const metadata = {
  title: "Free Checklist: 7 Questions to Ask Before You Book",
  description:
    "Before you book a mobile coffee bar or any event vendor, ask these 7 questions. Free checklist from Sophisticated Sips, Tampa Bay's luxury mobile espresso catering.",
};

export default function ChecklistPage() {
  return (
    <div className="lux-page">
      <header className="lux-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lux-hero__media" src="/gallery/03-barista-pour.jpg" alt="" style={{ objectPosition: "center 52%" }} />
        <div className="lux-hero__shade" />
        <div className="lux-hero__content">
          <p className="lux-kicker">Free checklist</p>
          <h1>7 questions that save<br />you from a bad day</h1>
          <span className="lux-script">Before you book a mobile coffee bar for your event.</span>
          <p className="lux-lead">
            Enter your email and get the checklist that shows you exactly what to ask any vendor, before you hand over a deposit.
          </p>
        </div>
      </header>

      <section className="lux-section lux-section--deep">
        <div className="wrap lux-form-layout">
          <div className="lux-form-intro">
            <p className="lux-kicker">No pitch, just the checklist</p>
            <h2>What&apos;s inside</h2>
            <p>
              Insurance, power and water, weather plans, real minimums, booking lead time — the questions that
              actually separate a smooth event from a stressful one. You can also ask Kai for it directly.
            </p>
            <div className="lux-actions">
              <Link href="/#kai" className="btn btn-lux btn-ghost">Ask Kai instead</Link>
            </div>
          </div>
          <div className="lux-form-shell">
            <ChecklistForm />
          </div>
        </div>
      </section>
    </div>
  );
}
