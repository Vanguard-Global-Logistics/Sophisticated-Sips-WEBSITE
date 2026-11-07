import { PaymentPersistenceError } from "./create-tracked-payment-link";

export type InvoiceDraftRecord = {
  invoiceId: string;
  orderId: string;
  version: number;
};

export type PublishedInvoiceRecord = {
  invoiceId: string;
  orderId: string;
  publicUrl: string | null;
  status: string;
};

type PersistResult = { error: unknown | null };

export class InvoicePublishError extends Error {
  readonly publishError: unknown;
  readonly draft: InvoiceDraftRecord;

  constructor(publishError: unknown, draft: InvoiceDraftRecord) {
    super("The invoice was recorded locally but Square could not publish it.");
    this.name = "InvoicePublishError";
    this.publishError = publishError;
    this.draft = draft;
  }
}

/**
 * Create a Square invoice draft, save its ids locally, and only then publish it.
 * Publishing is the step that emails the customer, so an untracked invoice can
 * never be sent.
 */
export async function createTrackedInvoice(opts: {
  createDraft: () => Promise<InvoiceDraftRecord>;
  persist: (draft: InvoiceDraftRecord) => PromiseLike<PersistResult>;
  publish: (draft: InvoiceDraftRecord) => Promise<PublishedInvoiceRecord>;
}) {
  const draft = await opts.createDraft();

  let result: PersistResult;
  try {
    result = await opts.persist(draft);
  } catch (error) {
    throw new PaymentPersistenceError(error);
  }
  if (result.error) throw new PaymentPersistenceError(result.error);

  try {
    return await opts.publish(draft);
  } catch (error) {
    throw new InvoicePublishError(error, draft);
  }
}
