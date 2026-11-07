type RpcResult = {
  data: unknown;
  error: unknown | null;
};

type BookingPipelineDb = {
  rpc: (
    fn: "create_booking_with_lead",
    args: { p_booking: Record<string, unknown>; p_lead: Record<string, unknown> },
  ) => PromiseLike<RpcResult>;
};

export class BookingPersistenceError extends Error {
  readonly persistenceError: unknown;

  constructor(persistenceError: unknown) {
    super("Booking and pipeline lead could not be saved atomically.");
    this.name = "BookingPersistenceError";
    this.persistenceError = persistenceError;
  }
}

/**
 * Persists a public booking request and its sales-pipeline lead in one database
 * transaction. The RPC is restricted to service_role in the accompanying SQL.
 */
export async function createBookingPipeline(
  db: BookingPipelineDb,
  booking: Record<string, unknown>,
  lead: Record<string, unknown>,
) {
  let result: RpcResult;
  try {
    result = await db.rpc("create_booking_with_lead", {
      p_booking: booking,
      p_lead: lead,
    });
  } catch (error) {
    throw new BookingPersistenceError(error);
  }
  if (result.error) throw new BookingPersistenceError(result.error);
  if (typeof result.data !== "string" || !result.data) {
    throw new BookingPersistenceError(new Error("Database returned no booking id."));
  }
  return result.data;
}
