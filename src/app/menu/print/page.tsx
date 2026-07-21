import PrintButton from "@/components/public/PrintButton";

export const metadata = {
  title: "Menu Flyer — Sophisticated Sips",
  robots: { index: false, follow: false }, // print artifact, not for search
};

/**
 * Print-ready menu flyer.
 * Menu-Locked.png is the LOCKED official brand — displayed as-is at full quality, never
 * altered or cropped. The Order-QR sits in a dedicated strip BELOW the menu
 * (lower-right of the page) so it covers zero menu content; the whole sheet fits
 * one Letter page. The teal QR sits on a white card (quiet zone) to stay scannable.
 */
export default function MenuFlyer() {
  return (
    <div className="mflyer-screen">
      <PrintButton />
      <div className="mflyer-sheet">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mflyer-img" src="/branding/menu/Menu-Locked.png" alt="Sophisticated Sips menu" />
        <div className="mflyer-order">
          <div className="mflyer-order-cap">Scan to Order</div>
          <div className="mflyer-qr-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mflyer-qr-img" src="/branding/qr/Order-QR.png" alt="Scan to order" />
          </div>
        </div>
      </div>
    </div>
  );
}
