import { describe, expect, it } from "vitest";
import { isBookableEventDate } from "../src/lib/bookings/validate-event-date";

const now = new Date("2026-11-06T15:00:00.000Z");

describe("booking event date validation", () => {
  it("accepts today and future real calendar dates", () => {
    expect(isBookableEventDate("2026-11-06", now)).toBe(true);
    expect(isBookableEventDate("2027-02-28", now)).toBe(true);
    expect(isBookableEventDate("2028-02-29", now)).toBe(true);
  });

  it("rejects past dates before persistence", () => {
    expect(isBookableEventDate("2026-11-05", now)).toBe(false);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isBookableEventDate("11/07/2026", now)).toBe(false);
    expect(isBookableEventDate("2026-02-29", now)).toBe(false);
    expect(isBookableEventDate("2026-13-01", now)).toBe(false);
    expect(isBookableEventDate("2026-11-31", now)).toBe(false);
    expect(isBookableEventDate(null, now)).toBe(false);
  });
});
