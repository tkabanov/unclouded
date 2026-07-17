import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useModuleWizard } from "@/components/modules/useModuleWizard";

describe("useModuleWizard", () => {
  it("starts on intro and advances through questions", () => {
    const { result } = renderHook(() => useModuleWizard("identity"));

    expect(result.current.currentStep.kind).toBe("intro");

    act(() => {
      result.current.goNext();
    });

    expect(result.current.currentStep.kind).toBe("question");
    if (result.current.currentStep.kind === "question") {
      expect(result.current.currentStep.question.id).toBe("iq1");
    }

    act(() => {
      result.current.setAnswer("iq1", "performance_based");
      result.current.goNext();
    });

    if (result.current.currentStep.kind === "question") {
      expect(result.current.currentStep.question.id).toBe("iq2");
    }
    expect(result.current.answers.iq1).toBe("performance_based");
  });

  it("preserves answers when going back", () => {
    const { result } = renderHook(() => useModuleWizard("identity"));

    act(() => {
      result.current.goNext();
      result.current.setAnswer("iq1", "inherent");
      result.current.goNext();
      result.current.goBack();
    });

    expect(result.current.answers.iq1).toBe("inherent");
  });
});
