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

  it("returns null without server validation when no local session exists", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    const result = await resolveValidatedAuthSession();

    expect(result).toEqual({ session: null, user: null });
    expect(getUser).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("clears local auth when getUser fails", async () => {
    const session = { user: { id: "user-1" }, access_token: "token" };
    getSession.mockResolvedValue({ data: { session }, error: null });
    getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Invalid JWT"),
    });

    const result = await resolveValidatedAuthSession();

    expect(result).toEqual({ session: null, user: null });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("returns session when getUser succeeds", async () => {
    const user = { id: "user-1", email: "test@example.com" };
    const session = { user, access_token: "token" };

    getSession.mockResolvedValue({ data: { session }, error: null });
    getUser.mockResolvedValue({ data: { user }, error: null });

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

  it("clearLocalAuthSession force-wipes persisted auth after signOut", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example-project.supabase.co");
    window.localStorage.setItem("sb-example-project-auth-token", "stale");

    await clearLocalAuthSession();

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(window.localStorage.getItem("sb-example-project-auth-token")).toBeNull();
    vi.unstubAllEnvs();
  });
});
