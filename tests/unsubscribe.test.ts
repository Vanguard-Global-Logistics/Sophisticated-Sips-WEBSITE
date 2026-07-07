import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => { process.env.UNSUBSCRIBE_SECRET = "test-secret-for-unit-tests"; });

describe("unsubscribe tokens", () => {
  it("round-trips a valid token", async () => {
    const { makeUnsubToken, verifyUnsubToken } = await import("../src/lib/email/unsubscribe");
    const t = makeUnsubToken("Client@Example.com");
    expect(verifyUnsubToken(t)).toBe("client@example.com"); // normalized
  });

  it("rejects tampered tokens", async () => {
    const { makeUnsubToken, verifyUnsubToken } = await import("../src/lib/email/unsubscribe");
    const t = makeUnsubToken("a@b.com");
    const forged = Buffer.from(
      JSON.stringify({ e: "victim@b.com", s: JSON.parse(Buffer.from(t, "base64url").toString()).s })
    ).toString("base64url");
    expect(verifyUnsubToken(forged)).toBeNull();
  });

  it("rejects garbage", async () => {
    const { verifyUnsubToken } = await import("../src/lib/email/unsubscribe");
    expect(verifyUnsubToken("not-a-token")).toBeNull();
  });
});
