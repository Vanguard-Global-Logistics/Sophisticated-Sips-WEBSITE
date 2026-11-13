type EmailSendResult = {
  error?: unknown | null;
};

/**
 * Booking persistence is authoritative. Receipt delivery is best-effort, but
 * the caller must know whether the provider accepted the email so the UI does
 * not promise a confirmation that was never sent.
 */
export async function attemptBookingReceipt(
  send: () => PromiseLike<EmailSendResult>,
) {
  try {
    const result = await send();
    if (result.error) {
      console.error("booking receipt:", result.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("booking receipt:", error);
    return false;
  }
}
