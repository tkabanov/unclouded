import { describe, expect, it } from "vitest";

import { CAREER_STAGE, EMPLOYMENT_STATUS } from "@/lib/enums/aboutYouProfile";
import { CUSTOMER_ROLE } from "@/lib/enums/customerProfile";
import {
  applyRoleTypesAboutYouPrefill,
  mapRoleTypesToAboutYouWorkPrefill,
} from "@/lib/settings/roleTypeAboutYouPrefill";

describe("mapRoleTypesToAboutYouWorkPrefill", () => {
  it("maps student onboarding role to student work fields", () => {
    expect(mapRoleTypesToAboutYouWorkPrefill([CUSTOMER_ROLE.STUDENT])).toEqual({
      employmentStatus: EMPLOYMENT_STATUS.STUDENT,
      careerStage: CAREER_STAGE.STUDENT,
    });
  });

  it("maps transition onboarding role to between roles and career transition", () => {
    expect(mapRoleTypesToAboutYouWorkPrefill([CUSTOMER_ROLE.TRANSITION])).toEqual({
      employmentStatus: EMPLOYMENT_STATUS.BETWEEN_ROLES,
      careerStage: CAREER_STAGE.TRANSITION,
    });
  });

  it("does not map pro — too ambiguous for work prefill", () => {
    expect(mapRoleTypesToAboutYouWorkPrefill([CUSTOMER_ROLE.PRO])).toEqual({});
  });

  it("merges prefills from multiple roles in order", () => {
    expect(
      mapRoleTypesToAboutYouWorkPrefill([CUSTOMER_ROLE.PRO, CUSTOMER_ROLE.STUDENT]),
    ).toEqual({
      employmentStatus: EMPLOYMENT_STATUS.STUDENT,
      careerStage: CAREER_STAGE.STUDENT,
    });
  });
});

describe("applyRoleTypesAboutYouPrefill", () => {
  it("prefills empty work fields from roleTypes", () => {
    const result = applyRoleTypesAboutYouPrefill(
      {
        employmentStatus: "",
        careerStage: "",
      },
      [CUSTOMER_ROLE.STUDENT],
    );

    expect(result.employmentStatus).toBe(EMPLOYMENT_STATUS.STUDENT);
    expect(result.careerStage).toBe(CAREER_STAGE.STUDENT);
  });

  it("does not overwrite existing work fields", () => {
    const result = applyRoleTypesAboutYouPrefill(
      {
        employmentStatus: EMPLOYMENT_STATUS.SELF_EMPLOYED,
        careerStage: CAREER_STAGE.MID,
      },
      [CUSTOMER_ROLE.STUDENT],
    );

    expect(result.employmentStatus).toBe(EMPLOYMENT_STATUS.SELF_EMPLOYED);
    expect(result.careerStage).toBe(CAREER_STAGE.MID);
  });
});
