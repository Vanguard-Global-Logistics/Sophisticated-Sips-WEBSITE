import fs from "fs";
import path from "path";
import { SecHead } from "@/components/public/Bits";

export const metadata = { title: "Gallery — Sophisticated Sips" };

/** Reads real photos from /public/gallery at build/request time.
 *  Name files like: "01 - Golden hour trailer.jpg" — the caption comes from the filename. */
export default function Gallery() {
  const dir = path.join(process.cwd(), "public", "gallery");
  let photos: { src: string; caption: string; wide: boolean }[] = [];
  try {
    photos = fs.readdirSync(dir)
      .filter((f: string) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort()
      .map((f: string, i: number) => ({
        src: `/gallery/${f}`,
        caption: f.replace(/^\d+\s*-\s*/, "").replace(/\.[^.]+$/, ""),
        wide: i % 5 === 0,
      }));
  } catch {}

  return (
    <div className="section">
      <div className="wrap">
        <SecHead kicker="Gallery" title="The trailer in its element"
          sub="Real events, real pours — the Sophisticated Sips experience across Florida." />
        {photos.length === 0 ? (
          /* No photos on disk yet → branded "what to expect" tiles (no fake event claims).
             To show real photos: drop images into /public/gallery named like
             "01 - Golden hour trailer.jpg" — the filename becomes the caption. */
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            {[
              ["☕", "The espresso bar", "linear-gradient(150deg,#1A4E4B,#0A2423)", true],
              ["✨", "Golden Pulse Latte", "linear-gradient(150deg,#6E4A22,#2B1D12)", false],
              ["🥞", "The crepe station", "linear-gradient(150deg,#8A5A2E,#2B1D12)", false],
              ["🍰", "Artisan dessert display", "linear-gradient(150deg,#5A3A1E,#0A2423)", false],
              ["🚐", "The trailer, event-ready", "linear-gradient(150deg,#0F3433,#2B1D12)", true],
              ["🥤", "Iced signature drinks", "linear-gradient(150deg,#123B3A,#3A2110)", false],
            ].map(([e, t, g, wide]) => (
              <div key={t as string} className={`tile ${wide ? "wide" : ""}`} style={{ background: g as string }}>
                <span style={{ fontSize: 34, position: "absolute", top: 16, left: 16 }}>{e}</span>
                <b>{t}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            {photos.map((p) => (
              <figure key={p.src} className={`tile ${p.wide ? "wide" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.caption} loading="lazy" decoding="async" />
                <b>{p.caption}</b>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
