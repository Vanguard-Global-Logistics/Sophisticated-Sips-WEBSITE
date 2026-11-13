import { describe, expect, it, vi } from "vitest";
import { PaymentPersistenceError } from "../src/lib/payments/create-tracked-payment-link";
import {
  createTrackedInvoice,
  InvoicePublishError,
  type InvoiceDraftRecord,
} from "../src/lib/payments/create-tracked-invoice";

const draft: InvoiceDraftRecord = {
  invoiceId: "invoice-1",
  orderId: "order-1",
  version: 1,
};

const published = {
  invoiceId: "invoice-1",
  orderId: "order-1",
  publicUrl: "https://square.test/invoice/1",
  status: "UNPAID",
};

describe("tracked Square invoices", () => {
  it("records the draft before Square publishes and emails it", async () => {
    const order: string[] = [];
    const createDraft = vi.fn(async () => {
      order.push("draft");
      return draft;
    });
    const persist = vi.fn(async (created: InvoiceDraftRecord) => {
      order.push("persist");
      expect(created).toEqual(draft);
      return { error: null };
    });
    const publish = vi.fn(async (created: InvoiceDraftRecord) => {
      order.push("publish");
      expect(created).toEqual(draft);
      return published;
    });

    await expect(createTrackedInvoice({ createDraft, persist, publish }))
      .resolves.toEqual(published);
    expect(order).toEqual(["draft", "persist", "publish"]);
  });

  it("does not publish or email when persistence returns an error", async () => {
    const databaseError = { message: "database unavailable" };
    const publish = vi.fn();

    await expect(createTrackedInvoice({
      createDraft: async () => draft,
      persist: async () => ({ error: databaseError }),
      publish,
    })).rejects.toMatchObject({
      name: "PaymentPersistenceError",
      persistenceError: databaseError,
    });
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not publish or email when persistence throws", async () => {
    const databaseError = new Error("connection reset");
    const publish = vi.fn();

    await expect(createTrackedInvoice({
      createDraft: async () => draft,
      persist: async () => { throw databaseError; },
      publish,
    })).rejects.toBeInstanceOf(PaymentPersistenceError);
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not persist or publish when draft creation fails", async () => {
    const squareError = new Error("Square unavailable");
    const persist = vi.fn();
    const publish = vi.fn();

    await expect(createTrackedInvoice({
      createDraft: async () => { throw squareError; },
      persist,
      publish,
    })).rejects.toBe(squareError);
    expect(persist).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("reports a tracked publish failure without encouraging a blind retry", async () => {
    const squareError = new Error("publish unavailable");

    await expect(createTrackedInvoice({
      createDraft: async () => draft,
      persist: async () => ({ error: null }),
      publish: async () => { throw squareError; },
    })).rejects.toMatchObject({
      name: "InvoicePublishError",
      publishError: squareError,
      draft,
    });
  });

  it("does not expose provider details in persistence or publish messages", () => {
    const detail = { message: "sensitive provider detail" };
    expect(new PaymentPersistenceError(detail).message)
      .not.toContain("sensitive provider detail");
    expect(new InvoicePublishError(detail, draft).message)
      .not.toContain("sensitive provider detail");
  });
});
