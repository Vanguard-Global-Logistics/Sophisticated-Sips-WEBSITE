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

  it("strips a trailing slash from NEXT_PUBLIC_SITE_URL (prod 401 root cause)", async () => {
    const { webhookNotificationUrls } = await import("../src/lib/square/client");
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.sophisticatedsips.net/";
    const urls = webhookNotificationUrls(new Headers());
    expect(urls).toEqual(["https://www.sophisticatedsips.net/api/square/webhook"]);
  });

  it("also tries the URL Square actually posted to, without duplicates", async () => {
    const { webhookNotificationUrls } = await import("../src/lib/square/client");
    process.env.NEXT_PUBLIC_SITE_URL = "https://sophisticatedsips.net";
    const headers = new Headers({ "x-forwarded-host": "www.sophisticatedsips.net", "x-forwarded-proto": "https" });
    expect(webhookNotificationUrls(headers)).toEqual([
      "https://sophisticatedsips.net/api/square/webhook",
      "https://www.sophisticatedsips.net/api/square/webhook",
    ]);
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.sophisticatedsips.net";
    expect(webhookNotificationUrls(headers)).toEqual(["https://www.sophisticatedsips.net/api/square/webhook"]);
  });
});
