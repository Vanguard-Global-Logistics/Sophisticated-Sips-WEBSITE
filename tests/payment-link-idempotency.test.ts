import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { resolvePaymentRequestKey } from "../src/lib/payments/request-key";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("payment-link retry idempotency", () => {
  it("preserves a valid owner request key", () => {
    const generate = vi.fn(() => "11111111-1111-4111-8111-111111111111");
    expect(resolvePaymentRequestKey("AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA", generate))
      .toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(generate).not.toHaveBeenCalled();
  });

  it("supplies a key for a cached older owner client", () => {
    expect(resolvePaymentRequestKey(undefined, () => "11111111-1111-4111-8111-111111111111"))
      .toBe("11111111-1111-4111-8111-111111111111");
  });

  it("rejects a malformed supplied key", () => {
    expect(() => resolvePaymentRequestKey("retry-me")).toThrow("Invalid payment request identifier.");
  });

  it("wires one key through browser, route, Square, and duplicate-safe persistence", () => {
    const owner = read("src/components/admin/OwnerDashboard.tsx");
    const route = read("src/app/api/square/create-payment-link/route.ts");
    const client = read("src/lib/square/client.ts");
    expect(owner).toContain("paymentRequestKeys.current[requestIdentity] ??= crypto.randomUUID()");
    expect(owner).toContain("amountCents, requestKey");
    expect(owner).toContain("delete paymentRequestKeys.current[requestIdentity]");
    expect(route).toContain("idempotencyKey = resolvePaymentRequestKey(requestKey)");
    expect(route).toContain("idempotencyKey,");
    expect(route).toContain('onConflict: "square_order_id", ignoreDuplicates: true');
    expect(client).toContain("idempotencyKey: opts.idempotencyKey ?? crypto.randomUUID()");
  });
});
