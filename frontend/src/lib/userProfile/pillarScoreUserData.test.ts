import { describe, expect, it } from "vitest";
import { readQuestionScores } from "./pillarScoreUserData";

describe("readQuestionScores", () => {
  it("reads sq1–sq5 from nested stabilityScores", () => {
    const scores = readQuestionScores(
      {
        stabilityScores: {
          sq1: 5,
          sq2: 4,
          sq3: 3,
          sq4: 2,
          sq5: 1,
        },
      },
      "sq",
    );

    expect(scores).toEqual({ q1: 5, q2: 4, q3: 3, q4: 2, q5: 1 });
  });

  it("reads bubble sq1_number fields from onboarding root", () => {
    const scores = readQuestionScores(
      {
        sq1_number: 4,
        sq2_number: 3,
        sq3_number: 3,
        sq4_number: 2,
        sq5_number: 1,
      },
      "sq",
    );

    expect(scores).toEqual({ q1: 4, q2: 3, q3: 3, q4: 2, q5: 1 });
  });
});
