import { describe, expect, it, vi } from "vitest";
import { applyPaidPayment } from "../src/lib/database/payments";

type MutationCall = {
  table: string;
  values: Record<string, unknown>;
  column: string;
  value: unknown;
};

function fakeDb(options: { eventError?: unknown; paymentError?: unknown } = {}) {
  const calls: MutationCall[] = [];
  const from = vi.fn((table: string) => ({
    update: (values: Record<string, unknown>) => ({
      eq: async (column: string, value: unknown) => {
        calls.push({ table, values, column, value });
        return {
          error: table === "events"
            ? options.eventError ?? null
            : options.paymentError ?? null,
        };
      },
    }),
  }));

  return { db: { from } as never, calls };
}

const pendingDeposit = {
  id: "payment-1",
  event_id: "event-1",
  kind: "deposit",
  status: "pending",
};

describe("payment reconciliation", () => {
  it("updates the event before marking the payment paid", async () => {
    const { db, calls } = fakeDb();

    await expect(applyPaidPayment(db, pendingDeposit)).resolves.toBe(true);

    expect(calls.map(({ table }) => table)).toEqual(["events", "payments"]);
    expect(calls[0]).toMatchObject({
      table: "events",
      values: { deposit_paid: true },
      column: "id",
      value: "event-1",
    });
    expect(calls[1]).toMatchObject({
      table: "payments",
      values: { status: "paid" },
      column: "id",
      value: "payment-1",
    });
    expect(calls[1].values.paid_at).toEqual(expect.any(String));
  });

  it("keeps the payment retryable when the event update fails", async () => {
    const databaseError = { message: "event update unavailable" };
    const { db, calls } = fakeDb({ eventError: databaseError });

    await expect(applyPaidPayment(db, pendingDeposit)).rejects.toMatchObject({
      message: "Payment reconciliation failed during event update.",
      cause: databaseError,
    });
    expect(calls.map(({ table }) => table)).toEqual(["events"]);
  });

  it("surfaces a payment update failure after reasserting the event flag", async () => {
    const databaseError = { message: "payment update unavailable" };
    const { db, calls } = fakeDb({ paymentError: databaseError });

    await expect(applyPaidPayment(db, pendingDeposit)).rejects.toMatchObject({
      message: "Payment reconciliation failed during payment update.",
      cause: databaseError,
    });
    expect(calls.map(({ table }) => table)).toEqual(["events", "payments"]);
  });

  it("repairs event flags for an already-paid duplicate webhook", async () => {
    const { db, calls } = fakeDb();

    await expect(applyPaidPayment(db, {
      ...pendingDeposit,
      kind: "full",
      status: "paid",
    })).resolves.toBe(false);

    expect(calls).toEqual([{
      table: "events",
      values: { deposit_paid: true, balance_paid: true },
      column: "id",
      value: "event-1",
    }]);
  });

  it("does nothing when no matching payment exists", async () => {
    const { db, calls } = fakeDb();

    await expect(applyPaidPayment(db, null)).resolves.toBe(false);
    expect(calls).toEqual([]);
  });
});
