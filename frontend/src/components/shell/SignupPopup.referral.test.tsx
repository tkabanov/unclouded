import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SignupPopup from "@/components/shell/SignupPopup";
import {
  REFERRAL_CODE_AUTH_METADATA_KEY,
  captureReferralFromSearch,
  clearPendingReferralCode,
  peekPendingReferralCode,
} from "@/lib/share/referralAttribution";

// NCLDD-56 test plan A4: `?ref=CODE` survives navigation and is sent on sign-up.

const signUp = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signUp: (...args: unknown[]) => signUp(...args) } },
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

/** Mirrors the `location.search` effect in `pages/Index.tsx` for each visited URL. */
function visit(search: string) {
  captureReferralFromSearch(search);
}

function renderSignup() {
  const onSuccess = vi.fn();
  render(<SignupPopup open onOpenChange={() => {}} onSuccess={onSuccess} onSwitchToLogin={() => {}} />);
  return { onSuccess };
}

function submitSignup() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "friend@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
}

function signUpMetadata(): Record<string, string> | undefined {
  const [args] = signUp.mock.calls[0] as [{ options?: { data?: Record<string, string> } }];
  return args.options?.data;
}

describe("signup referral attribution (A4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    clearPendingReferralCode();
    signUp.mockResolvedValue({ data: {}, error: null });
  });

  it("sends the ref code captured on /signup?ref=… with sign-up", async () => {
    visit("?ref=k8234v9b");
    const { onSuccess } = renderSignup();
    submitSignup();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(signUp).toHaveBeenCalledTimes(1);
    expect(signUpMetadata()).toMatchObject({ [REFERRAL_CODE_AUTH_METADATA_KEY]: "K8234V9B" });
  });

  it("keeps the ref code after leaving signup (login, other pages) and coming back", async () => {
    visit("?ref=K8234V9B");
    // signup -> login -> landing -> back to signup without the query param
    visit("");
    visit("?mode=login");
    visit("");
    expect(peekPendingReferralCode()).toBe("K8234V9B");

    const { onSuccess } = renderSignup();
    submitSignup();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(signUpMetadata()).toMatchObject({ [REFERRAL_CODE_AUTH_METADATA_KEY]: "K8234V9B" });
  });

  it("keeps the first-touch code when a second ref link is opened before sign-up", async () => {
    visit("?ref=K8234V9B");
    visit("?ref=ABCD2345");

    const { onSuccess } = renderSignup();
    submitSignup();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(signUpMetadata()).toMatchObject({ [REFERRAL_CODE_AUTH_METADATA_KEY]: "K8234V9B" });
  });

  it("clears the pending code after a successful sign-up (confirm email / login reuse no stale code)", async () => {
    visit("?ref=K8234V9B");
    const { onSuccess } = renderSignup();
    submitSignup();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(peekPendingReferralCode()).toBeNull();
  });

  it("keeps the pending code when sign-up fails so a retry is still attributed", async () => {
    signUp.mockResolvedValueOnce({ data: {}, error: new Error("Network down") });
    visit("?ref=K8234V9B");
    const { onSuccess } = renderSignup();
    submitSignup();

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(onSuccess).not.toHaveBeenCalled();
    expect(peekPendingReferralCode()).toBe("K8234V9B");
  });

  it("signs up normally without referral metadata for an invalid ref code (M-11)", async () => {
    visit("?ref=bad code!");
    expect(peekPendingReferralCode()).toBeNull();

    const { onSuccess } = renderSignup();
    submitSignup();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
    expect(signUpMetadata()?.[REFERRAL_CODE_AUTH_METADATA_KEY]).toBeUndefined();
  });

  it("ignores a tampered stored code instead of sending it", async () => {
    sessionStorage.setItem("uncloud360.pendingReferralCode", "<script>");
    const { onSuccess } = renderSignup();
    submitSignup();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(signUpMetadata()?.[REFERRAL_CODE_AUTH_METADATA_KEY]).toBeUndefined();
  });
});
