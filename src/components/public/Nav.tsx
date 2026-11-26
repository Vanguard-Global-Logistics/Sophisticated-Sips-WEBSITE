"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/public/Logo";

const LINKS = [
  ["Home", "/"], ["Catering", "/catering"], ["Menu", "/menu"],
  ["Gallery", "/gallery"], ["About", "/about"], ["Contact", "/contact"],
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="logo" aria-label="Sophisticated Sips — home">
          <Logo size={56} priority />
        </Link>
        <a href="tel:+18135953536" className="nav-phone">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
          </svg>
          (813) 595-3536
        </a>
        <div className="nav-links">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className={`nav-link ${path === href ? "on" : ""}`}>{label}</Link>
          ))}
          <Link href="/owner" className={`nav-link ${path?.startsWith("/owner") ? "on" : ""}`}>Owner</Link>
          <Link href="/book" className="nav-book">Book Event</Link>
        </div>
      </div>
    </nav>
  );
}
