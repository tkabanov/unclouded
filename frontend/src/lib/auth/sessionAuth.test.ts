import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const getSession = vi.fn();
const signOut = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => getUser(...args),
      getSession: (...args: unknown[]) => getSession(...args),
      signOut: (...args: unknown[]) => signOut(...args),
    },
  },
}));

import {
  clearLocalAuthSession,
  resolveValidatedAuthSession,
  signOutEverywhere,
} from "@/lib/auth/sessionAuth";

describe("sessionAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue({ error: null });
  });

  it("clears local auth when getUser fails", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Invalid JWT"),
    });

    const result = await resolveValidatedAuthSession();

    expect(result).toEqual({ session: null, user: null });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("returns session when getUser succeeds", async () => {
    const user = { id: "user-1", email: "test@example.com" };
    const session = { user, access_token: "token" };

    getUser.mockResolvedValue({ data: { user }, error: null });
    getSession.mockResolvedValue({ data: { session }, error: null });

    const result = await resolveValidatedAuthSession();

    expect(result).toEqual({ session, user });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signOutEverywhere always clears local storage", async () => {
    signOut
      .mockResolvedValueOnce({ error: new Error("server gone") })
      .mockResolvedValueOnce({ error: null });

    await signOutEverywhere();

    expect(signOut).toHaveBeenNthCalledWith(1, { scope: "global" });
    expect(signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
  });

  it("clearLocalAuthSession uses local scope", async () => {
    await clearLocalAuthSession();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
