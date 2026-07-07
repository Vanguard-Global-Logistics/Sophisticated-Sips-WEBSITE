/** Best-effort in-memory rate limiter for public endpoints.
 *  Serverless caveat: state is per-instance, so this softens abuse rather than
 *  hard-stopping it. For hard guarantees add Vercel WAF rules or an Upstash
 *  Redis limiter — noted in LAUNCH.md as a post-launch hardening step. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

export function clientKey(req: Request, scope: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${scope}:${ip}`;
}
