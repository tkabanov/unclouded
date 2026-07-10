const RECOVERY_AUTH_STORAGE_KEY = "unclouded:recovery_user_id";

function readStoredRecoveryUserId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const value = sessionStorage.getItem(RECOVERY_AUTH_STORAGE_KEY);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function writeStoredRecoveryUserId(userId: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (userId) {
      sessionStorage.setItem(RECOVERY_AUTH_STORAGE_KEY, userId);
      return;
    }
    sessionStorage.removeItem(RECOVERY_AUTH_STORAGE_KEY);
  } catch {
    // Private mode / quota — in-memory authorization still works for this tab.
  }
}

let recoveryUserId: string | null = readStoredRecoveryUserId();

export function authorizeRecoveryUser(userId: string): void {
  recoveryUserId = userId;
  writeStoredRecoveryUserId(userId);
}

export function isRecoveryAuthorizedForUser(userId: string | undefined | null): boolean {
  if (!userId) return false;
  if (!recoveryUserId) {
    recoveryUserId = readStoredRecoveryUserId();
  }
  if (!recoveryUserId) return false;
  return recoveryUserId === userId;
}

export function clearRecoveryAuthorization(): void {
  recoveryUserId = null;
  writeStoredRecoveryUserId(null);
}

/** Test-only reset of module state (memory + sessionStorage). */
export function resetRecoveryAuthorizationState(): void {
  recoveryUserId = null;
  writeStoredRecoveryUserId(null);
}

/** Test-only: simulate reload by clearing in-memory cache while sessionStorage remains. */
export function resetRecoveryAuthorizationMemoryForTests(): void {
  recoveryUserId = null;
}
