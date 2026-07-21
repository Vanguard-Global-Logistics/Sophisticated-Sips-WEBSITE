/** @type {import('next').NextConfig} */

// Security response headers applied to every route. Low-risk, high-value set.
// (A strict Content-Security-Policy is deferred to Sprint 2 — it needs the final
// production domains for connect-src/img-src and would risk breaking Supabase/
// Square/font loading if guessed here.)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // microphone=(self) keeps the KAI/VoiceCommand mic feature working; camera/geo off.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  poweredByHeader: false,
  eslint: {
    // Lint is enforced via `npm run lint`; keep builds resilient to the
    // img-element warnings on the gallery/home hero.
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
