import { randomUUID } from "node:crypto";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Preserve one Square idempotency key across retries of the same owner action. */
export function resolvePaymentRequestKey(
  value: unknown,
  generate: () => string = randomUUID,
) {
  if (value === undefined || value === null || value === "") return generate();
  const key = String(value).trim();
  if (!UUID_PATTERN.test(key)) throw new Error("Invalid payment request identifier.");
  return key.toLowerCase();
}
