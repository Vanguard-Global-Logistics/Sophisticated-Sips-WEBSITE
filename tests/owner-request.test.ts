import { describe, expect, it } from "vitest";
import { runOwnerRequest } from "../src/lib/owner-request";

describe("owner setup request boundary", () => {
  it("returns parsed object data for success", async () => {
    await expect(runOwnerRequest(
      async () => ({ ok: true, json: async () => ({ settings: { business_name: "Sips" } }) }),
      "fallback",
    )).resolves.toEqual({ ok: true, data: { settings: { business_name: "Sips" } } });
  });

  it("returns a safe API error for a rejected response", async () => {
    await expect(runOwnerRequest(
      async () => ({ ok: false, json: async () => ({ error: "Setup is unavailable." }) }),
      "fallback",
    )).resolves.toEqual({ ok: false, error: "Setup is unavailable." });
  });

  it("falls back for an unsafe error payload", async () => {
    await expect(runOwnerRequest(
      async () => ({ ok: false, json: async () => ({ detail: "private" }) }),
      "Setup unavailable.",
    )).resolves.toEqual({ ok: false, error: "Setup unavailable." });
  });

  it("never rejects on unreadable JSON", async () => {
    await expect(runOwnerRequest(
      async () => ({ ok: true, json: async () => { throw new Error("invalid JSON"); } }),
      "Setup unavailable.",
    )).resolves.toEqual({ ok: false, error: "Setup unavailable." });
  });

  it("never rejects on a transport failure", async () => {
    await expect(runOwnerRequest(
      async () => { throw new Error("connection reset"); },
      "Setup unavailable.",
    )).resolves.toEqual({ ok: false, error: "Setup unavailable." });
  });
});
