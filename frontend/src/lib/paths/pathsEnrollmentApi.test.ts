import { beforeEach, describe, expect, it, vi } from "vitest";
import { enrollInPath } from "./pathsEnrollmentApi";

const fetchPathCatalogEntry = vi.fn();
const fetchPathSessionsByKey = vi.fn();
const createPathEnrollmentRow = vi.fn();

const pathEnrollmentChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "pathEnrollment") return pathEnrollmentChain;
      return {
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
    }),
  },
}));

vi.mock("@/lib/paths/pathsCatalogApi", () => ({
  fetchPathCatalogEntry: (...args: unknown[]) => fetchPathCatalogEntry(...args),
  fetchPathSessionsByKey: (...args: unknown[]) => fetchPathSessionsByKey(...args),
}));

vi.mock("@/lib/paths/pathsOnboardingEnrollmentApi", () => ({
  createPathEnrollmentRow: (...args: unknown[]) => createPathEnrollmentRow(...args),
}));

describe("enrollInPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPathEnrollmentRow.mockResolvedValue("enrollment-id");
    fetchPathSessionsByKey.mockResolvedValue([]);
  });

  it("rejects enrollment when module prerequisites are not met", async () => {
    fetchPathCatalogEntry.mockResolvedValue({
      id: "path-id",
      slug: "understanding-your-emotional-patterns",
      triggerSignals: "enrollment:onboarding; prerequisite:module:identity",
    });

    await expect(
      enrollInPath("user-id", "understanding-your-emotional-patterns", {}, {
        moduleIdentityComplete: false,
      }),
    ).rejects.toThrow("Complete Identity Lens to unlock this path");

    expect(createPathEnrollmentRow).not.toHaveBeenCalled();
  });

  it("allows enrollment when module prerequisites are met", async () => {
    fetchPathCatalogEntry.mockResolvedValue({
      id: "path-id",
      slug: "understanding-your-emotional-patterns",
      triggerSignals: "enrollment:onboarding; prerequisite:module:identity",
    });

    await enrollInPath("user-id", "understanding-your-emotional-patterns", {}, {
      moduleIdentityComplete: true,
    });

    expect(createPathEnrollmentRow).toHaveBeenCalledWith("user-id", "path-id", {
      setAsPrimary: true,
    });
  });
});
