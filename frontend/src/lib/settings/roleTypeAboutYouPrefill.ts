import {
  CAREER_STAGE,
  EMPLOYMENT_STATUS,
  type AboutYouProfileValues,
} from "@/lib/enums/aboutYouProfile";
import { CUSTOMER_ROLE, type CustomerRoleSlug } from "@/lib/enums/customerProfile";

export type AboutYouWorkPrefill = Pick<AboutYouProfileValues, "employmentStatus" | "careerStage">;

const ROLE_TYPE_TO_ABOUT_YOU_PREFILL: Partial<
  Record<CustomerRoleSlug, AboutYouWorkPrefill>
> = {
  [CUSTOMER_ROLE.STUDENT]: {
    employmentStatus: EMPLOYMENT_STATUS.STUDENT,
    careerStage: CAREER_STAGE.STUDENT,
  },
  [CUSTOMER_ROLE.TRANSITION]: {
    employmentStatus: EMPLOYMENT_STATUS.BETWEEN_ROLES,
    careerStage: CAREER_STAGE.TRANSITION,
  },
  [CUSTOMER_ROLE.RETIRED]: {
    employmentStatus: EMPLOYMENT_STATUS.RETIRED,
    careerStage: CAREER_STAGE.SEMI_RETIRED,
  },
  [CUSTOMER_ROLE.CAREGIVER]: {
    employmentStatus: EMPLOYMENT_STATUS.CAREGIVER,
    careerStage: CAREER_STAGE.NOT_APPLICABLE,
  },
  // "pro" is intentionally omitted — too broad (employed vs self-employed vs leadership).
};

function isCustomerRoleSlug(value: string): value is CustomerRoleSlug {
  return Object.values(CUSTOMER_ROLE).includes(value as CustomerRoleSlug);
}

export function mapRoleTypeToAboutYouWorkPrefill(
  roleType: string | null | undefined,
): AboutYouWorkPrefill {
  if (!roleType?.trim() || roleType === "admin" || !isCustomerRoleSlug(roleType)) {
    return {};
  }

  return ROLE_TYPE_TO_ABOUT_YOU_PREFILL[roleType] ?? {};
}

export function applyRoleTypeAboutYouPrefill<T extends AboutYouWorkPrefill>(
  aboutYou: T,
  roleType: string | null | undefined,
): T {
  const prefill = mapRoleTypeToAboutYouWorkPrefill(roleType);

  return {
    ...aboutYou,
    employmentStatus: aboutYou.employmentStatus?.trim()
      ? aboutYou.employmentStatus
      : (prefill.employmentStatus ?? aboutYou.employmentStatus),
    careerStage: aboutYou.careerStage?.trim()
      ? aboutYou.careerStage
      : (prefill.careerStage ?? aboutYou.careerStage),
  };
}
