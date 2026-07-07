import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return ["", "/catering", "/menu", "/gallery", "/about", "/book"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === "/menu" ? "weekly" : "monthly",
    priority: p === "" ? 1 : p === "/book" ? 0.9 : 0.7,
  }));
}
