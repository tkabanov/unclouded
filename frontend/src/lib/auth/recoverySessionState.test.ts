import { afterEach, describe, expect, it } from "vitest";
import {
  authorizeRecoveryUser,
  clearRecoveryAuthorization,
  isRecoveryAuthorizedForUser,
  resetRecoveryAuthorizationState,
} from "@/lib/auth/recoverySessionState";

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
});
