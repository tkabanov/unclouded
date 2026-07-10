import {
  authorizeRecoveryUser,
  clearRecoveryAuthorization,
  isRecoveryAuthorizedForUser,
  resetRecoveryAuthorizationMemoryForTests,
  resetRecoveryAuthorizationState,
} from "@/lib/auth/recoverySessionState";

const RECOVERY_AUTH_STORAGE_KEY = "unclouded:recovery_user_id";

describe("recoverySessionState", () => {
  afterEach(() => {
    resetRecoveryAuthorizationState();
  });

  it("authorizes only the bound recovery user", () => {
    authorizeRecoveryUser("user-a");
    expect(isRecoveryAuthorizedForUser("user-a")).toBe(true);
    expect(isRecoveryAuthorizedForUser("user-b")).toBe(false);
    expect(isRecoveryAuthorizedForUser(undefined)).toBe(false);
  });

  it("clears authorization on sign out", () => {
    authorizeRecoveryUser("user-a");
    clearRecoveryAuthorization();
    expect(isRecoveryAuthorizedForUser("user-a")).toBe(false);
  });

  it("persists authorization across a full page refresh on /reset_pw", () => {
    authorizeRecoveryUser("user-a");
    expect(sessionStorage.getItem(RECOVERY_AUTH_STORAGE_KEY)).toBe("user-a");

    resetRecoveryAuthorizationMemoryForTests();
    expect(isRecoveryAuthorizedForUser("user-a")).toBe(true);
  });
});
