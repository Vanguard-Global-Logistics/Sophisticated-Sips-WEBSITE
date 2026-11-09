type JsonResponse = {
  ok: boolean;
  json: () => PromiseLike<unknown>;
};

export type OwnerPaymentRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Normalizes owner-initiated payment API calls. This function never rejects,
 * so callers can always clear their busy state and allow a safe retry.
 */
export async function runOwnerPaymentRequest<T>(
  request: () => PromiseLike<JsonResponse>,
  fallbackError: string,
): Promise<OwnerPaymentRequestResult<T>> {
  try {
    const response = await request();
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { ok: false, error: fallbackError };
    }
    if (!response.ok) {
      const error = typeof data === "object" && data !== null &&
        "error" in data && typeof data.error === "string"
        ? data.error
        : fallbackError;
      return { ok: false, error };
    }
    if (typeof data !== "object" || data === null) {
      return { ok: false, error: fallbackError };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: fallbackError };
  }
}
