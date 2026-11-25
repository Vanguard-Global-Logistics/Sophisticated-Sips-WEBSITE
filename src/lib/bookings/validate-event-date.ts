const EVENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Accepts only real calendar dates in the booking form's YYYY-MM-DD format,
 * and rejects dates before the current UTC date.
 */
export function isBookableEventDate(value: unknown, now = new Date()) {
  if (typeof value !== "string" || !EVENT_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) return false;

  const today = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  return candidate >= today;
}
