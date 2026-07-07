import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sophisticated Sips — Luxury Mobile Espresso Catering in Florida";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Branded social-share card for iMessage/Facebook/LinkedIn link previews. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #0A2423 0%, #0F3433 45%, #16110C 100%)",
        color: "#F6EFE3", fontFamily: "Georgia, serif",
      }}>
        <div style={{
          fontSize: 28, letterSpacing: 10, textTransform: "uppercase",
          color: "#C9A45C", marginBottom: 28, display: "flex",
        }}>
          Luxury Mobile Espresso · Florida
        </div>
        <div style={{ fontSize: 92, fontWeight: 600, display: "flex" }}>
          Sophisticated <span style={{ color: "#C9A45C", marginLeft: 24 }}>Sips</span>
        </div>
        <div style={{ fontSize: 32, opacity: 0.85, marginTop: 30, display: "flex" }}>
          Espresso bar · crepes · desserts — catered beautifully
        </div>
        <div style={{
          marginTop: 44, fontSize: 26, color: "#2B1D12", background: "#C9A45C",
          padding: "16px 42px", borderRadius: 40, display: "flex", fontWeight: 700,
        }}>
          Book your event
        </div>
      </div>
    ),
    size
  );
}
