import { beforeAll, describe, expect, it } from "vitest";
import crypto from "crypto";

beforeAll(() => { process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "sq-test-key"; });

describe("square webhook verification", () => {
  const url = "https://example.com/api/square/webhook";
  const body = JSON.stringify({ type: "payment.updated" });
  const sign = () =>
    crypto.createHmac("sha256", "sq-test-key").update(url + body).digest("base64");

  it("accepts a valid signature", async () => {
    const { verifySquareWebhook } = await import("../src/lib/square/client");
    expect(verifySquareWebhook(body, sign(), url)).toBe(true);
  });

  it("rejects a wrong signature and a missing header", async () => {
    const { verifySquareWebhook } = await import("../src/lib/square/client");
    expect(verifySquareWebhook(body, "bad-signature", url)).toBe(false);
    expect(verifySquareWebhook(body, null, url)).toBe(false);
  });
});
