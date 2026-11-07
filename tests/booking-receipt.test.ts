import { describe, expect, it, vi } from "vitest";
import { attemptBookingReceipt } from "../src/lib/email/booking-receipt";

describe("booking receipt delivery", () => {
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
