import {
  CAREER_STAGE,
  EMPLOYMENT_STATUS,
  type AboutYouProfileValues,
} from "@/lib/enums/aboutYouProfile";
import { CUSTOMER_ROLE, type CustomerRoleSlug } from "@/lib/enums/customerProfile";
import {
  normalizeCustomerRoleTypes,
  parseCustomerRoleTypesFromProfile,
  resolvePrimaryCustomerRole,
} from "@/lib/enums/customerRoleTypes";

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

export function mapRoleTypesToAboutYouWorkPrefill(
  roleTypes: readonly string[] | CustomerRoleSlug[] | null | undefined,
  legacyRoleType?: string | null,
): AboutYouWorkPrefill {
  const roles = roleTypes?.length
    ? normalizeCustomerRoleTypes(roleTypes)
    : parseCustomerRoleTypesFromProfile(null, legacyRoleType);

  const merged: AboutYouWorkPrefill = {};

  for (const role of roles) {
    const prefill = ROLE_TYPE_TO_ABOUT_YOU_PREFILL[role] ?? {};
    if (!merged.employmentStatus && prefill.employmentStatus) {
      merged.employmentStatus = prefill.employmentStatus;
    }
    if (!merged.careerStage && prefill.careerStage) {
      merged.careerStage = prefill.careerStage;
    }
  }

  return merged;
}

/** @deprecated Use mapRoleTypesToAboutYouWorkPrefill — kept for single-role call sites. */
export function mapRoleTypeToAboutYouWorkPrefill(
  roleType: string | null | undefined,
): AboutYouWorkPrefill {
  return mapRoleTypesToAboutYouWorkPrefill(null, roleType);
}

export function applyRoleTypesAboutYouPrefill<T extends AboutYouWorkPrefill>(
  aboutYou: T,
  roleTypes: readonly string[] | CustomerRoleSlug[] | null | undefined,
  legacyRoleType?: string | null,
): T {
  const prefill = mapRoleTypesToAboutYouWorkPrefill(roleTypes, legacyRoleType);

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

/** @deprecated Use applyRoleTypesAboutYouPrefill. */
export function applyRoleTypeAboutYouPrefill<T extends AboutYouWorkPrefill>(
  aboutYou: T,
  roleType: string | null | undefined,
): T {
  return applyRoleTypesAboutYouPrefill(aboutYou, null, roleType);
}

export { resolvePrimaryCustomerRole };
