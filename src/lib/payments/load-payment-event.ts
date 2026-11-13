type LookupResult<T> = {
  data: T | null;
  error: unknown | null;
};

export class PaymentEventLookupError extends Error {
  readonly lookupError: unknown;

  constructor(lookupError: unknown) {
    super("The payment event could not be loaded.");
    this.name = "PaymentEventLookupError";
    this.lookupError = lookupError;
  }
}

/**
 * A payment resource must never be created unless its local event lookup
 * completed successfully. Normalize both returned database errors and thrown
 * transport failures so routes can fail closed before contacting Square.
 */
export async function loadPaymentEvent<T>(
  lookup: PromiseLike<LookupResult<T>>,
): Promise<T | null> {
  let result: LookupResult<T>;
  try {
    result = await lookup;
  } catch (error) {
    throw new PaymentEventLookupError(error);
  }
  if (result.error) throw new PaymentEventLookupError(result.error);
  return result.data;
}
