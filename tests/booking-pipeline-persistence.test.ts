import { describe, expect, it, vi } from "vitest";
import {
  BookingPersistenceError,
  createBookingPipeline,
} from "../src/lib/bookings/create-booking-pipeline";

const booking = {
  name: "Test Customer",
  email: "customer@example.test",
  event_date: "2026-12-15",
};

const lead = {
  name: "Test Customer",
  contact_email: "customer@example.test",
  source: "website",
};

describe("atomic booking pipeline", () => {
  it("uses the transaction RPC and returns its booking id", async () => {
    const rpc = vi.fn(async () => ({
      data: "booking-1",
      error: null,
    }));

    await expect(createBookingPipeline({ rpc } as never, booking, lead))
      .resolves.toBe("booking-1");
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("create_booking_with_lead", {
      p_booking: booking,
      p_lead: lead,
    });
  });

  it("fails closed when the transaction returns a database error", async () => {
    const databaseError = { message: "lead insert rejected" };
    const rpc = vi.fn(async () => ({
      data: null,
      error: databaseError,
    }));

    await expect(createBookingPipeline({ rpc } as never, booking, lead))
      .rejects.toMatchObject({
        name: "BookingPersistenceError",
        persistenceError: databaseError,
      });
  });

  it("normalizes a thrown connection failure", async () => {
    const databaseError = new Error("connection reset");
    const rpc = vi.fn(async () => {
      throw databaseError;
    });

    await expect(createBookingPipeline({ rpc } as never, booking, lead))
      .rejects.toMatchObject({
        name: "BookingPersistenceError",
        persistenceError: databaseError,
      });
  });

  it("rejects an apparently successful transaction with no booking id", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: null,
    }));

    await expect(createBookingPipeline({ rpc } as never, booking, lead))
      .rejects.toBeInstanceOf(BookingPersistenceError);
  });

  it("does not expose database details in its public error message", () => {
    const error = new BookingPersistenceError({ message: "sensitive database detail" });
    expect(error.message).not.toContain("sensitive database detail");
  });
});
