let recoveryUserId: string | null = null;

export function authorizeRecoveryUser(userId: string): void {
  recoveryUserId = userId;
}

export function isRecoveryAuthorizedForUser(userId: string | undefined | null): boolean {
  if (!userId || !recoveryUserId) return false;
  return recoveryUserId === userId;
}

export function clearRecoveryAuthorization(): void {
  recoveryUserId = null;
}

/** Test-only reset of module state. */
export function resetRecoveryAuthorizationState(): void {
  recoveryUserId = null;
}
