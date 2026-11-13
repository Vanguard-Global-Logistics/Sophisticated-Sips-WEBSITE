import { describe, expect, it } from "vitest";
import {
  loadPaymentEvent,
  PaymentEventLookupError,
} from "../src/lib/payments/load-payment-event";

describe("payment event lookup", () => {
  it("returns an event after a successful lookup", async () => {
    const event = { id: "event-1", title: "Customer event" };
    await expect(loadPaymentEvent(Promise.resolve({
      data: event,
      error: null,
    }))).resolves.toEqual(event);
  });

  it("preserves a genuine not-found result", async () => {
    await expect(loadPaymentEvent(Promise.resolve({
      data: null,
      error: null,
    }))).resolves.toBeNull();
  });

  it("fails closed on a returned database error", async () => {
    const databaseError = { message: "database unavailable" };
    await expect(loadPaymentEvent(Promise.resolve({
      data: null,
      error: databaseError,
    }))).rejects.toMatchObject({
      name: "PaymentEventLookupError",
      lookupError: databaseError,
    });
  });

  it("fails closed on a thrown connection error", async () => {
    const connectionError = new Error("connection reset");
    await expect(loadPaymentEvent(Promise.reject(connectionError)))
      .rejects.toMatchObject({
        name: "PaymentEventLookupError",
        lookupError: connectionError,
      });
  });

  it("does not expose private database detail in the public message", () => {
    const error = new PaymentEventLookupError({
      message: "sensitive database detail",
    });
    expect(error.message).not.toContain("sensitive database detail");
  });
});
