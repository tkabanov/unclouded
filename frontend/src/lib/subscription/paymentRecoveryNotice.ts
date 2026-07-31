const PAYMENT_RECOVERY_PENDING_KEY = "unclouded.paymentRecoveryPending";

/** Set when opening the billing portal from a pastDue subscription. */
export function markPaymentRecoveryPending(): void {
  try {
    sessionStorage.setItem(PAYMENT_RECOVERY_PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearPaymentRecoveryPending(): void {
  try {
    sessionStorage.removeItem(PAYMENT_RECOVERY_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function isPaymentRecoveryPending(): boolean {
  try {
    return sessionStorage.getItem(PAYMENT_RECOVERY_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function isRecoveredSubscriptionStatus(
  status: string | null | undefined,
): boolean {
  return (
    status === "active" ||
    status === "scheduledToCancel" ||
    status === "scheduledToDowngrade"
  );
}
