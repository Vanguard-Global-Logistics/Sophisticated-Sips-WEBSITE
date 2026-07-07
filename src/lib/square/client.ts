import { Client, Environment } from "square";
import crypto from "crypto";

/** Server-only Square client. Never import from client components. */
export function square() {
  return new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN!,
    environment: process.env.SQUARE_ENVIRONMENT === "production"
      ? Environment.Production
      : Environment.Sandbox,
  });
}

export const LOCATION_ID = () => process.env.SQUARE_LOCATION_ID!;

/** Create a hosted payment link (Quick Pay) for a deposit or balance. */
export async function createPaymentLink(opts: {
  name: string;
  amountCents: number;
  note?: string;
}) {
  const { result } = await square().checkoutApi.createPaymentLink({
    idempotencyKey: crypto.randomUUID(),
    quickPay: {
      name: opts.name.slice(0, 255),
      priceMoney: { amount: BigInt(opts.amountCents), currency: "USD" },
      locationId: LOCATION_ID(),
    },
    paymentNote: opts.note?.slice(0, 500),
    checkoutOptions: {
      redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/book?paid=1`,
      merchantSupportEmail: process.env.OUTREACH_FROM?.match(/<(.+)>/)?.[1],
    },
  });
  const link = result.paymentLink!;
  return {
    url: link.url!,
    paymentLinkId: link.id!,
    orderId: link.orderId!, // webhook payment.updated events carry this order_id
  };
}

/** Create + publish a Square invoice emailed to the client. */
export async function createInvoice(opts: {
  customerEmail: string;
  customerName: string;
  title: string;
  amountCents: number;
  dueDate?: string; // YYYY-MM-DD
}) {
  const sq = square();

  // 1. Find or create the customer.
  const { result: search } = await sq.customersApi.searchCustomers({
    query: { filter: { emailAddress: { exact: opts.customerEmail } } },
  });
  let customerId = search.customers?.[0]?.id;
  if (!customerId) {
    const { result: created } = await sq.customersApi.createCustomer({
      emailAddress: opts.customerEmail,
      givenName: opts.customerName.slice(0, 300),
    });
    customerId = created.customer!.id!;
  }

  // 2. Draft order for the amount.
  const { result: orderRes } = await sq.ordersApi.createOrder({
    idempotencyKey: crypto.randomUUID(),
    order: {
      locationId: LOCATION_ID(),
      customerId,
      lineItems: [{
        name: opts.title.slice(0, 512),
        quantity: "1",
        basePriceMoney: { amount: BigInt(opts.amountCents), currency: "USD" },
      }],
    },
  });
  const orderId = orderRes.order!.id!;

  // 3. Create + publish the invoice (Square emails it).
  const { result: invRes } = await sq.invoicesApi.createInvoice({
    idempotencyKey: crypto.randomUUID(),
    invoice: {
      locationId: LOCATION_ID(),
      orderId,
      primaryRecipient: { customerId },
      deliveryMethod: "EMAIL",
      title: "Sophisticated Sips — Event Catering",
      description: opts.title.slice(0, 65536),
      acceptedPaymentMethods: { card: true, squareGiftCard: false, bankAccount: true },
      paymentRequests: [{
        requestType: "BALANCE",
        dueDate: opts.dueDate ?? new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
      }],
    },
  });
  const invoice = invRes.invoice!;
  const { result: pub } = await sq.invoicesApi.publishInvoice(invoice.id!, {
    version: invoice.version!,
    idempotencyKey: crypto.randomUUID(),
  });
  return {
    invoiceId: pub.invoice!.id!,
    orderId,
    publicUrl: pub.invoice!.publicUrl ?? null,
    status: pub.invoice!.status ?? "UNKNOWN",
  };
}

/** Look up payment status for one of our stored order ids. */
export async function getPaymentStatusByOrder(orderId: string) {
  const { result } = await square().ordersApi.retrieveOrder(orderId);
  const order = result.order!;
  const paid = (order.tenders?.length ?? 0) > 0 && order.state === "COMPLETED";
  return {
    orderState: order.state ?? "UNKNOWN",
    paid,
    totalCents: Number(order.totalMoney?.amount ?? 0),
  };
}

/** Verify Square webhook signatures (x-square-hmacsha256-signature). */
export function verifySquareWebhook(rawBody: string, signatureHeader: string | null, notificationUrl: string) {
  if (!signatureHeader) return false;
  const hmac = crypto
    .createHmac("sha256", process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!)
    .update(notificationUrl + rawBody)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
