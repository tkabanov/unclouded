import { beforeEach, describe, expect, it, vi } from "vitest";

const resetPasswordForEmail = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args),
    },
    from: () => ({
      select: () => ({
        lte: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  },
}));

vi.mock("@/lib/appUrl", () => ({
  getAppOrigin: () => "https://app.example.com",
}));

describe("transactionalEmailHooks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("catalog includes US-606 password reset and Section 8 welcome copy", async () => {
    const { getTransactionalEmailDefinition, TRANSACTIONAL_EMAIL_CATALOG } = await import(
      "@/lib/email/transactionalEmailCatalog"
    );

    expect(getTransactionalEmailDefinition("auth_password_reset").subject).toBe(
      "Reset your Uncloud360 password",
    );
    expect(getTransactionalEmailDefinition("welcome_free_signup").subject).toBe(
      "Your PuP 360 results are in",
    );
    expect(TRANSACTIONAL_EMAIL_CATALOG.some((entry) => entry.id === "notification_reassessment_due")).toBe(
      true,
    );
  });

  it("sendPasswordResetTransactionalEmail delegates to passwordResetApi", async () => {
    const { sendPasswordResetTransactionalEmail } = await import(
      "@/lib/email/transactionalEmailHooks"
    );
    resetPasswordForEmail.mockResolvedValue({ error: null });

    const result = await sendPasswordResetTransactionalEmail("user@example.com");

    expect(result.status).toBe("sent");
    expect(result.emailId).toBe("auth_password_reset");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "https://app.example.com/reset_pw",
    });
  });

  it("welcome hook returns honest placeholder until SMTP edge is wired", async () => {
    const { requestTransactionalEmail } = await import("@/lib/email/transactionalEmailHooks");

    const result = await requestTransactionalEmail("welcome_free_signup", {
      userId: "user-1",
      email: "user@example.com",
      firstName: "Sam",
    });

    expect(result.status).toBe("placeholder");
    expect(result.detail).toContain("SMTP");
  });

  it("lists five live Supabase Auth templates in catalog", async () => {
    const { listLiveAuthTransactionalEmails } = await import(
      "@/lib/email/transactionalEmailCatalog"
    );

    expect(listLiveAuthTransactionalEmails()).toHaveLength(5);
  });

  it("auth-delegated hooks return skipped, not placeholder", async () => {
    const { requestTransactionalEmail } = await import("@/lib/email/transactionalEmailHooks");

    const result = await requestTransactionalEmail("auth_confirm_signup", { userId: "user-1" });

    expect(result.status).toBe("skipped");
    expect(result.definition.status).toBe("live");
  });

  it("branding uses noreply@uncloud360.ai sender", async () => {
    const { TRANSACTIONAL_EMAIL_FROM } = await import("@/lib/email/branding");
    const { TRANSACTIONAL_EMAIL_CATALOG } = await import("@/lib/email/transactionalEmailCatalog");

    expect(TRANSACTIONAL_EMAIL_FROM).toBe("noreply@uncloud360.ai");
    expect(TRANSACTIONAL_EMAIL_CATALOG.every((entry) => entry.from === TRANSACTIONAL_EMAIL_FROM)).toBe(
      true,
    );
  });
});
