type JsonResponse = {
  ok: boolean;
  json: () => PromiseLike<unknown>;
};

export type OwnerRequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Normalizes owner setup API calls. It never rejects, allowing the UI to
 * reliably clear busy state and offer a safe retry after transport failures.
 */
export async function runOwnerRequest<T>(
  request: () => PromiseLike<JsonResponse>,
  fallbackError: string,
): Promise<OwnerRequestResult<T>> {
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
