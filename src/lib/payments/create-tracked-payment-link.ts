export type PaymentLinkRecord = {
  url: string;
  paymentLinkId: string;
  orderId: string;
};

type PersistResult = { error: unknown | null };

export class PaymentPersistenceError extends Error {
  readonly persistenceError: unknown;

  constructor(persistenceError: unknown) {
    super("A provider payment resource was created but its local payment record could not be saved.");
    this.name = "PaymentPersistenceError";
    this.persistenceError = persistenceError;
  }
}

export class PaymentLinkResponseError extends Error {
  constructor() {
    super("Square did not return a complete hosted payment link.");
    this.name = "PaymentLinkResponseError";
  }
}

/** Reject incomplete provider responses before any local payment row is attempted. */
export function requireCompletePaymentLink(link: {
  url?: string | null;
  id?: string | null;
  orderId?: string | null;
} | null | undefined): PaymentLinkRecord {
  if (
    !link
    || typeof link.url !== "string"
    || !/^https:\/\//.test(link.url)
    || typeof link.id !== "string"
    || link.id.length === 0
    || typeof link.orderId !== "string"
    || link.orderId.length === 0
  ) {
    throw new PaymentLinkResponseError();
  }
  return {
    url: link.url,
    paymentLinkId: link.id,
    orderId: link.orderId,
  };
}

/**
 * Return a hosted payment link only after the matching pending payment row is saved.
 * Square may already contain a link when persistence fails, but that link is never
 * released to the caller.
 */
export async function createTrackedPaymentLink(opts: {
  createLink: () => Promise<PaymentLinkRecord>;
  persist: (link: PaymentLinkRecord) => PromiseLike<PersistResult>;
}) {
  const link = await opts.createLink();
  let result: PersistResult;
  try {
    result = await opts.persist(link);
  } catch (error) {
    throw new PaymentPersistenceError(error);
  }
  if (result.error) throw new PaymentPersistenceError(result.error);
  return link;
}
