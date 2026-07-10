import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorizeRecoveryUser,
  resetRecoveryAuthorizationState,
} from "@/lib/auth/recoverySessionState";

const resetPasswordForEmail = vi.fn();
const getSession = vi.fn();
const updateUser = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args),
      getSession: (...args: unknown[]) => getSession(...args),
      updateUser: (...args: unknown[]) => updateUser(...args),
    },
  },
}));

describe("passwordResetApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetRecoveryAuthorizationState();
    vi.stubGlobal("window", {
      location: { origin: "https://app.example.com" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requestPasswordResetEmail resolves even when send fails", async () => {
    const { requestPasswordResetEmail } = await import("@/lib/auth/passwordResetApi");
    resetPasswordForEmail.mockResolvedValue({ error: { message: "User not found" } });

    await expect(requestPasswordResetEmail("missing@example.com")).resolves.toBeUndefined();
  });

  it("sendPasswordResetEmail uses the reset_pw redirect", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/auth/passwordResetApi");
    resetPasswordForEmail.mockResolvedValue({ error: null });

    await sendPasswordResetEmail("user@example.com");

    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "https://app.example.com/reset_pw",
    });
  });

  it("completePasswordRecovery rejects when recovery was not authorized", async () => {
    const { completePasswordRecovery, PasswordRecoveryError } = await import(
      "@/lib/auth/passwordResetApi"
    );
    getSession.mockResolvedValue({
      data: { session: { user: { id: "user-a" } } },
    });

    await expect(completePasswordRecovery("new-password1")).rejects.toBeInstanceOf(
      PasswordRecoveryError,
    );
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("completePasswordRecovery updates password for an authorized recovery user", async () => {
    const { completePasswordRecovery } = await import("@/lib/auth/passwordResetApi");
    authorizeRecoveryUser("user-a");
    getSession.mockResolvedValue({
      data: { session: { user: { id: "user-a" } } },
    });
    updateUser.mockResolvedValue({ error: null });

    await completePasswordRecovery("new-password1");

    expect(updateUser).toHaveBeenCalledWith({ password: "new-password1" });
  });
});
