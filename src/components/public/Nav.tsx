"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["Home", "/"], ["Catering", "/catering"], ["Menu", "/menu"],
  ["Gallery", "/gallery"], ["About", "/about"],
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="logo">
          <div className="logo-cup">☕</div>
          <div className="logo-name serif">Sophisticated <em>Sips</em></div>
        </Link>
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
