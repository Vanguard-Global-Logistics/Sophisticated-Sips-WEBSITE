import { describe, expect, it, vi } from "vitest";
import {
  PaymentLookupError,
  PaymentRecordNotFoundError,
  PaymentReconciliationError,
  reconcilePaymentStatus,
} from "../src/lib/payments/reconcile-payment-status";

function fakeDb(options: {
  data?: Record<string, unknown> | null;
  error?: unknown;
  thrown?: unknown;
} = {}) {
  const single = vi.fn(async () => {
    if (options.thrown) throw options.thrown;
    return {
      data: options.data === undefined
        ? { id: "payment-1", square_order_id: "order-1", status: "pending" }
        : options.data,
      error: options.error ?? null,
    };
  });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { db: { from } as never, from, single };
}

const unpaidStatus = {
  orderState: "OPEN",
  paid: false,
  totalCents: 2500,
};

const paidStatus = {
  orderState: "COMPLETED",
  paid: true,
  totalCents: 2500,
};

describe("manual payment status reconciliation", () => {
  it("returns Square's unpaid status without mutating local records", async () => {
    const { db } = fakeDb();
    const getStatus = vi.fn().mockResolvedValue(unpaidStatus);
    const applyPaid = vi.fn();

    await expect(reconcilePaymentStatus(db, "payment-1", { getStatus, applyPaid }))
      .resolves.toEqual({ ...unpaidStatus, dbStatus: "pending" });

    expect(getStatus).toHaveBeenCalledWith("order-1");
    expect(applyPaid).not.toHaveBeenCalled();
  });

  it("marks a Square-paid payment before reporting local paid status", async () => {
    const { db } = fakeDb();
    const getStatus = vi.fn().mockResolvedValue(paidStatus);
    const applyPaid = vi.fn().mockResolvedValue(true);

    await expect(reconcilePaymentStatus(db, "payment-1", { getStatus, applyPaid }))
      .resolves.toEqual({ ...paidStatus, dbStatus: "paid" });

    expect(applyPaid).toHaveBeenCalledOnce();
  });

  it("fails closed when the payment lookup returns a database error", async () => {
    const databaseError = { message: "secret database detail" };
    const { db } = fakeDb({ error: databaseError });

    await expect(reconcilePaymentStatus(db, "payment-1", {
      getStatus: vi.fn(),
      applyPaid: vi.fn(),
    })).rejects.toMatchObject({
      name: PaymentLookupError.name,
      message: "Payment records are temporarily unavailable.",
      cause: databaseError,
    });
  });

  it("fails closed when the payment lookup throws", async () => {
    const connectionError = new Error("private connection detail");
    const { db } = fakeDb({ thrown: connectionError });

    await expect(reconcilePaymentStatus(db, "payment-1", {
      getStatus: vi.fn(),
      applyPaid: vi.fn(),
    })).rejects.toMatchObject({
      name: PaymentLookupError.name,
      cause: connectionError,
    });
  });

  it("distinguishes a missing payment from provider failure", async () => {
    const { db } = fakeDb({ data: null });

    await expect(reconcilePaymentStatus(db, "missing", {
      getStatus: vi.fn(),
      applyPaid: vi.fn(),
    })).rejects.toBeInstanceOf(PaymentRecordNotFoundError);
  });

  it("reports local reconciliation failure separately after Square confirms payment", async () => {
    const { db } = fakeDb();
    const reconciliationError = new Error("private write failure");

    await expect(reconcilePaymentStatus(db, "payment-1", {
      getStatus: vi.fn().mockResolvedValue(paidStatus),
      applyPaid: vi.fn().mockRejectedValue(reconciliationError),
    })).rejects.toMatchObject({
      name: PaymentReconciliationError.name,
      message: "Square shows this payment as paid, but local records could not be updated.",
      cause: reconciliationError,
    });
  });

  it("leaves Square provider failures identifiable to the route", async () => {
    const { db } = fakeDb();
    const providerError = new Error("Square unavailable");

    await expect(reconcilePaymentStatus(db, "payment-1", {
      getStatus: vi.fn().mockRejectedValue(providerError),
      applyPaid: vi.fn(),
    })).rejects.toBe(providerError);
  });
});
