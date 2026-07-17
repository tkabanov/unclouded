import { describe, expect, it } from "vitest";

import { resolveSessionOpeningTemplate } from "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts";
import type { ProfileData } from "../../../../supabase/functions/chat/prompt/types.ts";

function baseProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    firstName: "Alex",
    onboardingData: {},
    ...overrides,
  };
}

describe("resolveSessionOpeningTemplate", () => {
  it("uses after-module opening when a module was completed recently", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        onboardingData: {
          last_completed_module_name: "Identity Lens",
          last_completed_module_at: new Date().toISOString(),
        },
      }),
    );

    expect(opening.kind).toBe("returning_after_module");
    expect(opening.template).toContain("you just completed Identity Lens");
    expect(opening.template).toContain("Alex");
  });

  it("prefers after-module opening over generic returning session", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        onboardingData: {
          last_completed_module_name: "Identity Lens",
          last_completed_module_at: new Date().toISOString(),
          last_session_topic_text: "work stress",
        },
      }),
    );

    expect(opening.kind).toBe("returning_after_module");
    expect(opening.template).not.toContain("Last time we talked about work stress");
  });

  it("falls back to returning session when module completion is stale", () => {
    const opening = resolveSessionOpeningTemplate(
      baseProfile({
        onboardingData: {
          last_completed_module_name: "Identity Lens",
          last_completed_module_at: "2020-01-01T00:00:00.000Z",
          last_session_topic_text: "boundaries at work",
        },
      }),
    );

    expect(opening.kind).toBe("returning");
    expect(opening.template.toLowerCase()).toContain("boundaries at work");
    expect(opening.template).toContain("Alex");
  });
});
