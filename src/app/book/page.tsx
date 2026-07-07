import { SecHead } from "@/components/public/Bits";
import BookingForm from "@/components/public/BookingForm";

export const metadata = { title: "Book the Trailer — Sophisticated Sips" };

export default function Book() {
  return (
    <div className="section">
      <div className="wrap" style={{ maxWidth: 640 }}>
        <SecHead kicker="Book the trailer" title="Tell us about your event"
          sub="Two minutes now, a personal quote from Amy within one business day." />
        <BookingForm />
      </div>
    </div>
  );
}
