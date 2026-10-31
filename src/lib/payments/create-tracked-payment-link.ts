export type PaymentLinkRecord = {
  url: string;
  paymentLinkId: string;
  orderId: string;
};

type PersistResult = { error: unknown | null };

export class PaymentPersistenceError extends Error {
  readonly persistenceError: unknown;

  constructor(persistenceError: unknown) {
    super("Payment link was created but its local payment record could not be saved.");
    this.name = "PaymentPersistenceError";
    this.persistenceError = persistenceError;
  }
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
