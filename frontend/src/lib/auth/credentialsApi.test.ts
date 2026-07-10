import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const getAppOrigin = vi.fn(() => "https://app.example.com");

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signUp: (...args: unknown[]) => signUp(...args),
    },
  },
}));

vi.mock("@/lib/appUrl", () => ({
  getAppOrigin: () => getAppOrigin(),
}));

describe("credentialsApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAppOrigin.mockReturnValue("https://app.example.com");
  });

  it("signInWithEmailPassword calls Supabase auth with trimmed credentials", async () => {
    const { signInWithEmailPassword } = await import("@/lib/auth/credentialsApi");
    signInWithPassword.mockResolvedValue({ error: null });

    await signInWithEmailPassword("user@example.com", "password123");

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
  });

  it("signUpWithEmailPassword uses configured app origin for email redirect", async () => {
    getAppOrigin.mockReturnValue("http://127.0.0.1:3000");
    const { signUpWithEmailPassword } = await import("@/lib/auth/credentialsApi");
    signUp.mockResolvedValue({ error: null });

    await signUpWithEmailPassword("new@example.com", "password123");

    expect(signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      options: { emailRedirectTo: "http://127.0.0.1:3000" },
    });
  });

  it("signUpWithEmailPassword forwards signup metadata", async () => {
    const { signUpWithEmailPassword } = await import("@/lib/auth/credentialsApi");
    signUp.mockResolvedValue({ error: null });

    await signUpWithEmailPassword("new@example.com", "password123", {
      full_name: "Alex",
      timezone: "America/New_York",
    });

    expect(signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      options: {
        emailRedirectTo: "https://app.example.com",
        data: {
          full_name: "Alex",
          timezone: "America/New_York",
        },
      },
    });
  });

  it("maps invalid login errors to user-facing copy", async () => {
    const { getSignInErrorMessage } = await import("@/lib/auth/credentialsApi");
    expect(getSignInErrorMessage(new Error("Invalid login credentials"))).toBe(
      "Incorrect email or password.",
    );
    expect(getSignInErrorMessage(new Error("Network down"))).toBe("Network down");
  });

  it("detects already-registered signup errors", async () => {
    const { getSignUpErrorKind, getSignUpErrorMessage } = await import("@/lib/auth/credentialsApi");
    const err = new Error("User already registered");
    expect(getSignUpErrorKind(err)).toBe("already_registered");
    expect(getSignUpErrorMessage(err)).toBe(
      "This email is already registered. Try signing in instead.",
    );
  });

  it("validates credentials with shared schema", async () => {
    const { authCredentialsSchema } = await import("@/lib/auth/credentialsApi");
    const valid = authCredentialsSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    const invalid = authCredentialsSchema.safeParse({
      email: "not-an-email",
      password: "short",
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
