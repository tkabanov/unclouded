import { afterEach, describe, expect, it, vi } from "vitest";

describe("hasRecoveryHash", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a forged hash without an access token", async () => {
    vi.stubGlobal("window", { location: { hash: "#type=recovery" } });
    const { hasRecoveryHash } = await import("@/lib/auth/recoverySession");
    expect(hasRecoveryHash()).toBe(false);
  });

  it("accepts a recovery hash with an access token", async () => {
    vi.stubGlobal("window", { location: { hash: "#access_token=abc&type=recovery" } });
    const { hasRecoveryHash } = await import("@/lib/auth/recoverySession");
    expect(hasRecoveryHash()).toBe(true);
  });
});
