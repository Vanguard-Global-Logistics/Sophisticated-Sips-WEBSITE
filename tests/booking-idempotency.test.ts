import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { resolveBookingRequestKey } from "../src/lib/bookings/request-key";

describe("booking request idempotency", () => {
  it("preserves a valid client key across retries", () => {
    const key = "550e8400-e29b-41d4-a716-446655440000";
    const generate = vi.fn(() => "unused");
    expect(resolveBookingRequestKey(key.toUpperCase(), generate)).toBe(key);
    expect(generate).not.toHaveBeenCalled();
  });

  it("generates a key for a cached older client", () => {
    const generated = "db38e7a1-37cd-4f37-a034-25dbbd868a42";
    expect(resolveBookingRequestKey(undefined, () => generated)).toBe(generated);
  });

  it("rejects malformed supplied keys", () => {
    expect(() => resolveBookingRequestKey("retry-1")).toThrow(
      "Invalid booking request identifier.",
    );
  });

  it("ships a database uniqueness constraint and conflict-safe transaction", () => {
    const sql = readFileSync("supabase/migrations/014_booking_request_idempotency.sql", "utf8");
    expect(sql).toContain("unique (request_key)");
    expect(sql).toContain("on conflict (request_key) do update");
    expect(sql).toContain("where booking_request_id = v_booking_id");
  });
});
