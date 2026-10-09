import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/components/settings/admin/aiUsage/AiLimitAuditLog", () => ({
  default: () => null,
}));

vi.mock("@/lib/settings/admin/adminAiUsageApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/settings/admin/adminAiUsageApi")>()),
  fetchAiPlanLimits: vi.fn(),
  saveAiPlanLimit: vi.fn(),
  fetchAiUserLimitDetail: vi.fn(),
  setAiUserLimit: vi.fn(),
  restoreAiUserLimit: vi.fn(),
}));

import { toast } from "sonner";
import AiUsageLimitsPanel from "@/components/settings/admin/aiUsage/AiUsageLimitsPanel";
import AiUserLimitDialog from "@/components/settings/admin/aiUsage/AiUserLimitDialog";
import {
  fetchAiPlanLimits,
  fetchAiUserLimitDetail,
  restoreAiUserLimit,
  saveAiPlanLimit,
  setAiUserLimit,
  type AiPlanLimit,
  type AiUserLimitDetail,
} from "@/lib/settings/admin/adminAiUsageApi";

const NOT_SET_LIMITS: AiPlanLimit[] = (["free", "pro", "premium"] as const).flatMap((planTier) =>
  (["text", "voice"] as const).map((mode) => ({
    planTier,
    mode,
    monthlyUsd: null,
    updatedAt: null,
    updatedByName: null,
  })),
);

const USER_ID = "00000000-0000-4000-8000-000000000001";

const DETAIL: AiUserLimitDetail = {
  monthKey: "2026-10",
  user: { userId: USER_ID, displayName: "Test User", email: "test@example.com", tier: "free" },
  text: {
    mode: "text",
    tier: "free",
    source: "custom",
    limitUsd: 5,
    monthSpendUsd: 6,
    baselineUsd: 0,
    usedUsd: 6,
    remainingUsd: 0,
    exceeded: true,
  },
  voice: {
    mode: "voice",
    tier: "free",
    source: "unset",
    limitUsd: null,
    monthSpendUsd: 0,
    baselineUsd: 0,
    usedUsd: 0,
    remainingUsd: null,
    exceeded: false,
  },
  overrides: [{ mode: "text", kind: "custom", monthlyUsd: 5 }],
};

beforeAll(() => {
  // Radix primitives measure elements.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchAiPlanLimits).mockResolvedValue(NOT_SET_LIMITS);
  vi.mocked(fetchAiUserLimitDetail).mockResolvedValue(DETAIL);
});

describe("AiUsageLimitsPanel (NCLDD-52)", () => {
  async function renderPanel() {
    const view = render(<AiUsageLimitsPanel />);
    await waitFor(() => expect(view.container.querySelector("#ai-limit-free-text")).not.toBeNull());
    const input = (id: string) => view.container.querySelector(`#${id}`) as HTMLInputElement;
    const freeSave = () => screen.getAllByRole("button", { name: "Save" })[0];
    return { input, freeSave };
  }

  it("shows every plan limit as not set and Save disabled without changes", async () => {
    const { input, freeSave } = await renderPanel();
    expect(input("ai-limit-free-text").value).toBe("");
    expect(input("ai-limit-premium-voice").value).toBe("");
    expect(freeSave()).toBeDisabled();
  });

  it.each([
    ["-1", "Enter a non-negative amount with up to 2 decimals."],
    ["1.234", "Enter a non-negative amount with up to 2 decimals."],
    ["abc", "Enter a non-negative amount with up to 2 decimals."],
    ["100000.01", "Amount can't exceed $100,000."],
  ])("blocks Save for invalid input %s", async (value, message) => {
    const { input, freeSave } = await renderPanel();
    fireEvent.change(input("ai-limit-free-text"), { target: { value } });
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(freeSave()).toBeDisabled();
    expect(saveAiPlanLimit).not.toHaveBeenCalled();
  });

  it("does not show a failed save as applied and re-reads the stored value", async () => {
    vi.mocked(saveAiPlanLimit).mockResolvedValue({ ok: false, code: "invalid_amount", error: "Server said no" });
    const { input, freeSave } = await renderPanel();
    fireEvent.change(input("ai-limit-free-text"), { target: { value: "5" } });
    fireEvent.click(freeSave());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Server said no"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(saveAiPlanLimit).toHaveBeenCalledWith("free", "text", 5);
    expect(fetchAiPlanLimits).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(input("ai-limit-free-text").value).toBe(""));
  });

  it("surfaces a thrown save error without a success toast", async () => {
    vi.mocked(saveAiPlanLimit).mockRejectedValue(new Error("Network down"));
    const { input, freeSave } = await renderPanel();
    fireEvent.change(input("ai-limit-free-voice"), { target: { value: "2" } });
    fireEvent.click(freeSave());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Network down"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("reports no_change from the server as nothing saved", async () => {
    vi.mocked(saveAiPlanLimit).mockResolvedValue({ ok: true, code: "no_change", error: null });
    const { input, freeSave } = await renderPanel();
    fireEvent.change(input("ai-limit-free-text"), { target: { value: "5" } });
    fireEvent.click(freeSave());

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("No changes to save."));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("confirms success only after the server applied the change", async () => {
    vi.mocked(saveAiPlanLimit).mockResolvedValue({ ok: true, code: "updated", error: null });
    vi.mocked(fetchAiPlanLimits)
      .mockResolvedValueOnce(NOT_SET_LIMITS)
      .mockResolvedValueOnce(
        NOT_SET_LIMITS.map((row) =>
          row.planTier === "free" && row.mode === "text" ? { ...row, monthlyUsd: 10 } : row,
        ),
      );
    const { input, freeSave } = await renderPanel();
    fireEvent.change(input("ai-limit-free-text"), { target: { value: "10" } });
    fireEvent.click(freeSave());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Basic (Free) limits saved."));
    expect(saveAiPlanLimit).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(input("ai-limit-free-text").value).toBe("10"));
  });
});

describe("AiUserLimitDialog (NCLDD-52)", () => {
  async function renderDialog() {
    const onChanged = vi.fn();
    render(<AiUserLimitDialog userId={USER_ID} onOpenChange={() => {}} onChanged={onChanged} />);
    await screen.findByText("Effective: $5.00 — custom override");
    const textAmount = () => document.getElementById("text-amount") as HTMLInputElement;
    const textApply = () => screen.getAllByRole("button", { name: "Apply" })[0];
    return { onChanged, textAmount, textApply };
  }

  it("shows the effective limit source per mode", async () => {
    await renderDialog();
    expect(screen.getByText("Effective: $5.00 — custom override")).toBeInTheDocument();
    expect(screen.getByText("Effective: no limit — plan Basic (Free) has none set")).toBeInTheDocument();
  });

  it("rejects an invalid custom amount without calling the server", async () => {
    const { textAmount, textApply } = await renderDialog();
    fireEvent.change(textAmount(), { target: { value: "1.234" } });
    fireEvent.click(textApply());
    expect(toast.error).toHaveBeenCalledWith("Enter a non-negative amount with up to 2 decimals.");
    expect(setAiUserLimit).not.toHaveBeenCalled();
  });

  it("requires an amount for a custom limit", async () => {
    const { textAmount, textApply } = await renderDialog();
    fireEvent.change(textAmount(), { target: { value: "" } });
    fireEvent.click(textApply());
    expect(toast.error).toHaveBeenCalledWith("Enter an amount for the custom limit.");
    expect(setAiUserLimit).not.toHaveBeenCalled();
  });

  it("does not show a failed change as applied and reloads the stored limits", async () => {
    vi.mocked(setAiUserLimit).mockResolvedValue({ ok: false, code: "invalid_amount", error: "Denied" });
    const { textAmount, textApply } = await renderDialog();
    fireEvent.change(textAmount(), { target: { value: "7" } });
    fireEvent.click(textApply());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Denied"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(setAiUserLimit).toHaveBeenCalledWith(USER_ID, "text", "custom", 7);
    await waitFor(() => expect(fetchAiUserLimitDetail).toHaveBeenCalledTimes(2));
  });

  it("reports no_change honestly", async () => {
    vi.mocked(setAiUserLimit).mockResolvedValue({ ok: true, code: "no_change", error: null });
    const { textApply } = await renderDialog();
    fireEvent.click(textApply());
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Nothing changed."));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("restores only the chosen mode after confirmation", async () => {
    vi.mocked(restoreAiUserLimit).mockResolvedValue({ ok: true, code: "restored", error: null });
    const { onChanged } = await renderDialog();
    const [textRestore, voiceRestore] = screen.getAllByRole("button", { name: "Restore" });
    expect(voiceRestore).toBeDisabled(); // nothing used in voice

    fireEvent.click(textRestore);
    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Text limit restored for this month."));
    expect(restoreAiUserLimit).toHaveBeenCalledTimes(1);
    expect(restoreAiUserLimit).toHaveBeenCalledWith(USER_ID, "text");
    expect(onChanged).toHaveBeenCalled();
  });

  it("does not confirm a failed restore", async () => {
    vi.mocked(restoreAiUserLimit).mockResolvedValue({ ok: false, code: "error", error: "Restore failed" });
    await renderDialog();
    fireEvent.click(screen.getAllByRole("button", { name: "Restore" })[0]);
    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Restore failed"));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
