import { describe, expect, it, vi } from "vitest";
import { runOwnerPaymentRequest } from "../src/lib/payments/owner-payment-request";

describe("owner payment request boundary", () => {
  it("returns parsed data for a successful response", async () => {
    const request = vi.fn(async () => ({
      ok: true,
      json: async () => ({ url: "https://square.test/pay" }),
    }));
    await expect(runOwnerPaymentRequest<{ url: string }>(
      request,
      "fallback",
    )).resolves.toEqual({
      ok: true,
      data: { url: "https://square.test/pay" },
    });
  });

  it("returns the safe API error for a rejected response", async () => {
    await expect(runOwnerPaymentRequest(
      async () => ({
        ok: false,
        json: async () => ({ error: "Could not load the event." }),
      }),
      "fallback",
    )).resolves.toEqual({
      ok: false,
      error: "Could not load the event.",
    });
  });

  it("falls back when an error response contains no safe message", async () => {
    await expect(runOwnerPaymentRequest(
      async () => ({ ok: false, json: async () => ({ detail: "private" }) }),
      "Payment service unavailable.",
    )).resolves.toEqual({
      ok: false,
      error: "Payment service unavailable.",
    });
  });

  it("never rejects on unreadable JSON", async () => {
    await expect(runOwnerPaymentRequest(
      async () => ({
        ok: true,
        json: async () => { throw new Error("invalid JSON"); },
      }),
      "Payment service unavailable.",
    )).resolves.toEqual({
      ok: false,
      error: "Payment service unavailable.",
    });
  });

  it("never rejects on a transport failure", async () => {
    await expect(runOwnerPaymentRequest(
      async () => { throw new Error("connection reset"); },
      "Payment service unavailable.",
    )).resolves.toEqual({
      ok: false,
      error: "Payment service unavailable.",
    });
  });
});
