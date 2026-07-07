import crypto from "crypto";

/** Signed unsubscribe tokens so links can't be forged or enumerated. */
export function makeUnsubToken(email: string) {
  const sig = crypto
    .createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 32);
  return Buffer.from(JSON.stringify({ e: email.toLowerCase(), s: sig })).toString("base64url");
}

export function verifyUnsubToken(token: string): string | null {
  try {
    const { e, s } = JSON.parse(Buffer.from(token, "base64url").toString());
    const expect = crypto
      .createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
      .update(String(e).toLowerCase())
      .digest("hex")
      .slice(0, 32);
    return crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expect)) ? e : null;
  } catch {
    return null;
  }
}
