import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("invoice retry idempotency", () => {
  it("keeps one browser key until Square confirms the invoice", () => {
    const owner = read("src/components/admin/OwnerDashboard.tsx");
    expect(owner).toContain('const requestIdentity = `${ev.id}:invoice:${invoiceAmount}`');
    expect(owner).toContain("amountCents: invoiceAmount, requestKey");
    expect(owner).toContain("if (result.ok && result.data.ok) delete paymentRequestKeys.current[requestIdentity]");
  });

  it("validates the key before any Square work", () => {
    const route = read("src/app/api/square/create-invoice/route.ts");
    expect(route.indexOf("idempotencyKey = resolvePaymentRequestKey(requestKey)"))
      .toBeLessThan(route.indexOf("createInvoiceDraft({"));
    expect(route).toContain("idempotencyKey,");
  });

  it("persists the same Square invoice without overwriting an existing payment", () => {
    const route = read("src/app/api/square/create-invoice/route.ts");
    expect(route).toContain('onConflict: "square_invoice_id", ignoreDuplicates: true');
    expect(route).toContain("publishInvoiceDraft(draft, idempotencyKey)");
  });

  it("derives stable endpoint-specific Square keys", () => {
    const client = read("src/lib/square/client.ts");
    for (const suffix of ["customer", "order", "invoice", "publish"]) {
      expect(client).toContain(`idempotencyKey}-${suffix}`);
    }
  });
});
