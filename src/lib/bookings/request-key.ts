import { randomUUID } from "node:crypto";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * New clients send one stable key for every retry of the same booking form.
 * Missing keys from a cached older client receive a server key; malformed
 * supplied keys are rejected rather than silently defeating idempotency.
 */
export function resolveBookingRequestKey(
  value: unknown,
  generate: () => string = randomUUID,
) {
  if (value === undefined || value === null || value === "") return generate();
  const key = String(value).trim();
  if (!UUID_PATTERN.test(key)) throw new Error("Invalid booking request identifier.");
  return key.toLowerCase();
}
