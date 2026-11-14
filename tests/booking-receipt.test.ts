import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  attemptBookingReceipt,
  bookingReceiptIdempotencyKey,
} from "../src/lib/email/booking-receipt";

describe("booking receipt delivery", () => {
  it("derives one provider key from the stable booking request", () => {
    expect(bookingReceiptIdempotencyKey("550e8400-e29b-41d4-a716-446655440000"))
      .toBe("booking-receipt/550e8400-e29b-41d4-a716-446655440000");
  });

  it("wires the browser request key through the booking route and Resend", () => {
    const route = readFileSync("src/app/api/bookings/route.ts", "utf8");
    const email = readFileSync("src/lib/email/resend.ts", "utf8");
    expect(route).toContain("sendBookingReceipt(email, name, requestKey)");
    expect(email).toContain("idempotencyKey: bookingReceiptIdempotencyKey(requestKey)");
  });

  it("reports success only when the provider accepts the email", async () => {
    const send = vi.fn(async () => ({ error: null }));
    await expect(attemptBookingReceipt(send)).resolves.toBe(true);
    expect(send).toHaveBeenCalledOnce();
  });

  it("reports a returned provider error without failing the saved booking", async () => {
    const error = { message: "provider rejected request" };
    const send = vi.fn(async () => ({ error }));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(attemptBookingReceipt(send)).resolves.toBe(false);
    expect(consoleError).toHaveBeenCalledWith("booking receipt:", error);
    consoleError.mockRestore();
  });

  it("reports a thrown transport failure without failing the saved booking", async () => {
    const error = new Error("connection reset");
    const send = vi.fn(async () => {
      throw error;
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(attemptBookingReceipt(send)).resolves.toBe(false);
    expect(consoleError).toHaveBeenCalledWith("booking receipt:", error);
    consoleError.mockRestore();
  });
});
