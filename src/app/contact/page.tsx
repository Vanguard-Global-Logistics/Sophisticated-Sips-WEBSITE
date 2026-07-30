import Link from "next/link";
import ContactForm from "@/components/public/ContactForm";

export const metadata = {
  title: "Contact",
  description: "Contact Amy at Sophisticated Sips about mobile espresso, crepe, and event catering in Florida.",
};

export default function ContactPage() {
  return (
    <div className="lux-page">
      <header className="lux-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lux-hero__media" src="/gallery/04-bottle-display.jpg" alt="" style={{ objectPosition: "center 52%" }} />
        <div className="lux-hero__shade" />
        <div className="lux-hero__content">
          <p className="lux-kicker">Contact Sophisticated Sips</p>
          <h1>Let&apos;s start<br />planning</h1>
          <span className="lux-script">Amy is ready to hear your vision.</span>
          <p className="lux-lead">
            Ask a question, share your event details, or begin shaping a custom espresso and crepe experience.
          </p>
        </div>
      </header>

      <section className="lux-section lux-section--deep">
        <div className="wrap lux-form-layout">
          <div className="lux-form-intro">
            <p className="lux-kicker">A personal reply from Amy</p>
            <h1>Start a conversation</h1>
            <p>
              Tell Amy what you are planning and what matters most. For immediate planning help,
              Kai can compare current packages, estimate guest needs, and help build your menu.
            </p>
            <div className="lux-form-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gallery/03-barista-pour.jpg" alt="A Sophisticated Sips latte being handcrafted" />
            </div>
            <div className="lux-actions">
              <Link href="/#kai" className="btn btn-lux btn-ghost">Talk with Kai</Link>
            </div>
          </div>
          <div className="lux-form-shell">
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
