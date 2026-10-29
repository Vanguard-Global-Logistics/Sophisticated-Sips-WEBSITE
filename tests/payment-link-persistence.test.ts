import { describe, expect, it, vi } from "vitest";
import {
  createTrackedPaymentLink,
  PaymentPersistenceError,
  type PaymentLinkRecord,
} from "../src/lib/payments/create-tracked-payment-link";

const link: PaymentLinkRecord = {
  url: "https://square.test/pay",
  paymentLinkId: "plink-1",
  orderId: "order-1",
};

describe("tracked payment links", () => {
  it("returns a link only after its pending payment record is saved", async () => {
    const order: string[] = [];
    const createLink = vi.fn(async () => {
      order.push("create");
      return link;
    });
    const persist = vi.fn(async (created: PaymentLinkRecord) => {
      order.push("persist");
      expect(created).toEqual(link);
      return { error: null };
    });

    await expect(createTrackedPaymentLink({ createLink, persist })).resolves.toEqual(link);
    expect(order).toEqual(["create", "persist"]);
  });

  it("does not return the provider link when payment persistence fails", async () => {
    const databaseError = { message: "database unavailable" };
    const persist = vi.fn(async () => ({ error: databaseError }));

    await expect(createTrackedPaymentLink({
      createLink: async () => link,
      persist,
    })).rejects.toMatchObject({
      name: "PaymentPersistenceError",
      persistenceError: databaseError,
    });
  });

  it("does not attempt persistence when Square link creation fails", async () => {
    const squareError = new Error("Square unavailable");
    const persist = vi.fn();

    await expect(createTrackedPaymentLink({
      createLink: async () => { throw squareError; },
      persist,
    })).rejects.toBe(squareError);
    expect(persist).not.toHaveBeenCalled();
  });

  it("exposes a distinct error type without leaking database details in its message", () => {
    const error = new PaymentPersistenceError({ message: "sensitive provider detail" });
    expect(error).toBeInstanceOf(Error);
    expect(error.message).not.toContain("sensitive provider detail");
  });
});
