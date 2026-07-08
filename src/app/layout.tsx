import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit, Great_Vibes } from "next/font/google";
import "./globals.css";
import Nav from "@/components/public/Nav";
import Concierge from "@/components/ai/Concierge";
import Link from "next/link";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const script = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-script", display: "swap" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Sophisticated Sips — Luxury Mobile Espresso Catering in Florida",
    template: "%s · Sophisticated Sips",
  },
  description:
    "Luxury mobile espresso, handcrafted drinks, crepes, and dessert catering for unforgettable Florida events. Corporate events, weddings, schools, churches, and more.",
  openGraph: {
    title: "Sophisticated Sips on the Go",
    description: "Luxury mobile espresso and dessert catering for unforgettable Florida events.",
    type: "website",
    url: SITE,
    siteName: "Sophisticated Sips",
  },
  robots: process.env.NEXT_PUBLIC_APP_ENV === "production"
    ? { index: true, follow: true }
    : { index: false, follow: false }, // staging/preview must never be indexed
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A2423",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${outfit.variable} ${script.variable}`}>
      <body>
        {process.env.NEXT_PUBLIC_APP_ENV !== "production" && (
          <div role="status" style={{
            background: "repeating-linear-gradient(45deg,#C9A45C,#C9A45C 14px,#B0713E 14px,#B0713E 28px)",
            color: "#14100C", textAlign: "center", fontWeight: 700, fontSize: 13,
            letterSpacing: ".08em", padding: "8px 12px",
          }}>
            ⚠ STAGING MODE — test site. No real payments, no real customer emails.
          </div>
        )}
        <a href="#main" className="skip-link">Skip to content</a>
        <Nav />
        <main id="main">{children}</main>
        <footer className="foot2">
          <div className="wrap foot2-in">
            <span>© {new Date().getFullYear()} Sophisticated Sips. All rights reserved.</span>
            <span>Family-owned by Amy Lavold · <Link className="goldtxt" href="/book">Request a quote</Link></span>
          </div>
        </footer>
        <Concierge />
      </body>
    </html>
  );
}
