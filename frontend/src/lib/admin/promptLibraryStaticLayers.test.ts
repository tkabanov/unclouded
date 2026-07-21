import { describe, expect, it } from "vitest";

import {
  buildStaticPromptLayerMap,
  resolvePromptLayer,
} from "../../../../supabase/functions/chat/prompt/promptLibraryStaticLayers.ts";

describe("promptLibraryStaticLayers", () => {
  it("builds a static fallback map with core layers", () => {
    const map = buildStaticPromptLayerMap();
    expect(map.master_philosophy).toContain("adaptive guidance system");
    expect(map.general_rules).toBeTruthy();
  });

  it("prefers DB override content when present", () => {
    const resolved = resolvePromptLayer(
      { master_philosophy: "Override philosophy" },
      "master_philosophy",
      "Fallback philosophy",
    );
    expect(resolved).toBe("Override philosophy");
  });
});
