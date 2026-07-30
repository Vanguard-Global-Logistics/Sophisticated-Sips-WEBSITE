import ContactForm from "@/components/public/ContactForm";
import { SecHead } from "@/components/public/Bits";

export const metadata = {
  title: "Contact",
  description: "Contact Amy at Sophisticated Sips about mobile espresso, dessert, and event catering in Florida.",
};

export default function ContactPage() {
  return (
    <div className="section">
      <div className="wrap contact-layout">
        <div>
          <SecHead
            kicker="Contact Sophisticated Sips"
            title="Start a conversation"
            sub="Have a question before requesting a quote? Send Amy a note here, or talk with Kai for immediate event-planning help."
          />
          <div className="contact-kai-note">
            <span aria-hidden="true">✦</span>
            <div>
              <b>Need an answer now?</b>
              <p>Open Kai in the lower-right corner to compare packages, shape a menu, or estimate guest needs.</p>
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
