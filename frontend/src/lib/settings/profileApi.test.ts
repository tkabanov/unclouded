import { describe, expect, it, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { saveProfileForm } from "@/lib/settings/profileApi";

describe("saveProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves existing names when the form fields are empty", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        firstName: "Alex",
        lastName: "Taylor",
        onboardingData: {},
      },
      error: null,
    });

    await saveProfileForm("user-1", {
      firstName: "",
      lastName: "",
      sobrietyStartDate: "",
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Alex",
        lastName: "Taylor",
      }),
    );
  });
});
