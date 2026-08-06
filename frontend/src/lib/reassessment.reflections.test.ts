import { describe, expect, it } from "vitest";
import {
  PATH_ADAPTIVE_QUESTION_SLOT,
  reflectionQuestions,
  reflectionQuestionsWithAdaptive,
} from "@/lib/reassessment";

describe("reassessment reflection questions (Part 2)", () => {
  it("uses Section 3 standard wording", () => {
    expect(reflectionQuestions).toHaveLength(4);
    expect(reflectionQuestions[0]?.question).toBe(
      "Looking back at the past 90 days, what has shifted most in how you show up — even if the change is small?",
    );
    expect(reflectionQuestions[1]?.question).toBe(
      "What has been the hardest part of this period, and what does that tell you about what you most need right now?",
    );
    expect(reflectionQuestions[2]?.question).toBe(
      "What are you most ready to let go of, change, or move past as you head into the next 90 days?",
    );
    expect(reflectionQuestions[3]?.question).toBe(
      "If you could name one thing that would make the next 90 days meaningfully different from the last 90, what would it be?",
    );
  });

  it("replaces Question 4 (slot 3) with the path-adaptive variant", () => {
    expect(PATH_ADAPTIVE_QUESTION_SLOT).toBe(3);
    expect(reflectionQuestions[PATH_ADAPTIVE_QUESTION_SLOT]?.field).toBe("reflection_q4");

    const adaptive =
      "You completed the Getting Through Hard Seasons path. Where are you now compared to when you started - not the ideal version, the real one?";
    const labeled = reflectionQuestionsWithAdaptive(adaptive);

    expect(labeled[0]?.question).toBe(reflectionQuestions[0]?.question);
    expect(labeled[1]?.question).toBe(reflectionQuestions[1]?.question);
    expect(labeled[2]?.question).toBe(reflectionQuestions[2]?.question);
    expect(labeled[3]?.question).toBe(adaptive);
    expect(labeled[3]?.field).toBe("reflection_q4");
  });

  it("keeps standard Q4 when no path-adaptive prompt is provided", () => {
    expect(reflectionQuestionsWithAdaptive(null)).toEqual(reflectionQuestions);
    expect(reflectionQuestionsWithAdaptive("   ")).toEqual(reflectionQuestions);
  });
});
