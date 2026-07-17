import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { ProfileData } from "./prompt/types.ts";
import { loadServerLiveContext } from "./loadServerLiveContext.ts";

type ProfileRow = {
  firstName?: string | null;
  roleType?: string | null;
  primaryPillar?: string | null;
  tier?: string | null;
  subscribed?: boolean | null;
  results?: Record<string, unknown> | null;
  onboardingData?: Record<string, unknown> | null;
  modulesCompletedCount?: number | null;
  moduleIdentityComplete?: boolean | null;
  moduleRelationalComplete?: boolean | null;
  moduleHistoryComplete?: boolean | null;
  moduleFinancialComplete?: boolean | null;
  moduleBodyComplete?: boolean | null;
  moduleMeaningComplete?: boolean | null;
  moduleSchedules?: Record<string, unknown> | null;
  identitySelfWorthSource?: string | null;
  identityNarrativeType?: string | null;
  identityRoleFusionScore?: number | null;
  identityPressureOrigin?: string | null;
  attachmentSignal?: string | null;
  conflictPattern?: string | null;
  supportSeekingCapacity?: string | null;
  intimacySafetyLevel?: string | null;
  traumaActivationLevel?: string | null;
  griefLoadLevel?: string | null;
  priorSupportType?: string | null;
  significantEvents12mo?: unknown;
  financialStabilitySignal?: string | null;
  financialAnxietyLevel?: string | null;
  financialAgencyLevel?: string | null;
  sleepQualitySignal?: string | null;
  hormonalContextFlag?: boolean | null;
  hormonalContextType?: string | null;
  chronicPainFlag?: boolean | null;
  bodyRelationship?: string | null;
  substancePatternSignal?: string | null;
  purposeClarity?: string | null;
  spiritualFrameworkPresent?: boolean | null;
  spiritualFrameworkType?: string | null;
  belongingLevel?: string | null;
  pressureReach?: string | null;
  ageRange?: string | null;
  careerStage?: string | null;
  genderIdentity?: string | null;
  employmentStatus?: string | null;
  industry?: string | null;
  companySize?: string | null;
  workEnvironment?: string | null;
  managesATeam?: boolean | null;
  relationshipStatus?: string | null;
  parentingStatus?: string | null;
  chronicHealthCondition?: string | null;
  physicalActivityLevel?: string | null;
  stateRegion?: string | null;
  timeZone?: string | null;
};

const PROFILE_SELECT_COLUMNS = [
  "firstName",
  "roleType",
  "primaryPillar",
  "tier",
  "subscribed",
  "results",
  "onboardingData",
  "modulesCompletedCount",
  "moduleIdentityComplete",
  "moduleRelationalComplete",
  "moduleHistoryComplete",
  "moduleFinancialComplete",
  "moduleBodyComplete",
  "moduleMeaningComplete",
  "moduleSchedules",
  "identitySelfWorthSource",
  "identityNarrativeType",
  "identityRoleFusionScore",
  "identityPressureOrigin",
  "attachmentSignal",
  "conflictPattern",
  "supportSeekingCapacity",
  "intimacySafetyLevel",
  "traumaActivationLevel",
  "griefLoadLevel",
  "priorSupportType",
  "significantEvents12mo",
  "financialStabilitySignal",
  "financialAnxietyLevel",
  "financialAgencyLevel",
  "sleepQualitySignal",
  "hormonalContextFlag",
  "hormonalContextType",
  "chronicPainFlag",
  "bodyRelationship",
  "substancePatternSignal",
  "purposeClarity",
  "spiritualFrameworkPresent",
  "spiritualFrameworkType",
  "belongingLevel",
  "pressureReach",
  "ageRange",
  "careerStage",
  "genderIdentity",
  "employmentStatus",
  "industry",
  "companySize",
  "workEnvironment",
  "managesATeam",
  "relationshipStatus",
  "parentingStatus",
  "chronicHealthCondition",
  "physicalActivityLevel",
  "stateRegion",
  "timeZone",
].join(", ");

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Load profile fields and liveContext for the authenticated user — all server truth.
 */
export async function loadServerProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || typeof data !== "object") return null;

  const row = data as ProfileRow;
  const onboardingData = asRecord(row.onboardingData);
  const liveContext = await loadServerLiveContext(supabase, userId, onboardingData);

  const aboutYou = {
    ageRange: typeof row.ageRange === "string" ? row.ageRange : null,
    careerStage: typeof row.careerStage === "string" ? row.careerStage : null,
    genderIdentity: typeof row.genderIdentity === "string" ? row.genderIdentity : null,
    employmentStatus: typeof row.employmentStatus === "string" ? row.employmentStatus : null,
    industry: typeof row.industry === "string" ? row.industry : null,
    companySize: typeof row.companySize === "string" ? row.companySize : null,
    workEnvironment: typeof row.workEnvironment === "string" ? row.workEnvironment : null,
    managesATeam: typeof row.managesATeam === "boolean" ? row.managesATeam : null,
    relationshipStatus: typeof row.relationshipStatus === "string" ? row.relationshipStatus : null,
    parentingStatus: typeof row.parentingStatus === "string" ? row.parentingStatus : null,
    chronicHealthCondition:
      typeof row.chronicHealthCondition === "string" ? row.chronicHealthCondition : null,
    physicalActivityLevel:
      typeof row.physicalActivityLevel === "string" ? row.physicalActivityLevel : null,
    stateRegion: typeof row.stateRegion === "string" ? row.stateRegion : null,
    timeZone: typeof row.timeZone === "string" ? row.timeZone : null,
  };

  const hasAboutYou = Object.values(aboutYou).some(
    (value) => value !== null && value !== undefined,
  );

  const moduleProfile = {
    modulesCompletedCount: readNullableNumber(row.modulesCompletedCount),
    moduleIdentityComplete: readNullableBoolean(row.moduleIdentityComplete),
    moduleRelationalComplete: readNullableBoolean(row.moduleRelationalComplete),
    moduleHistoryComplete: readNullableBoolean(row.moduleHistoryComplete),
    moduleFinancialComplete: readNullableBoolean(row.moduleFinancialComplete),
    moduleBodyComplete: readNullableBoolean(row.moduleBodyComplete),
    moduleMeaningComplete: readNullableBoolean(row.moduleMeaningComplete),
    moduleSchedules:
      row.moduleSchedules && typeof row.moduleSchedules === "object" && !Array.isArray(row.moduleSchedules)
        ? (row.moduleSchedules as Record<string, unknown>)
        : null,
    identitySelfWorthSource: readNullableString(row.identitySelfWorthSource),
    identityNarrativeType: readNullableString(row.identityNarrativeType),
    identityRoleFusionScore: readNullableNumber(row.identityRoleFusionScore),
    identityPressureOrigin: readNullableString(row.identityPressureOrigin),
    attachmentSignal: readNullableString(row.attachmentSignal),
    conflictPattern: readNullableString(row.conflictPattern),
    supportSeekingCapacity: readNullableString(row.supportSeekingCapacity),
    intimacySafetyLevel: readNullableString(row.intimacySafetyLevel),
    traumaActivationLevel: readNullableString(row.traumaActivationLevel),
    griefLoadLevel: readNullableString(row.griefLoadLevel),
    priorSupportType: readNullableString(row.priorSupportType),
    significantEvents12mo: row.significantEvents12mo ?? null,
    financialStabilitySignal: readNullableString(row.financialStabilitySignal),
    financialAnxietyLevel: readNullableString(row.financialAnxietyLevel),
    financialAgencyLevel: readNullableString(row.financialAgencyLevel),
    sleepQualitySignal: readNullableString(row.sleepQualitySignal),
    hormonalContextFlag: readNullableBoolean(row.hormonalContextFlag),
    hormonalContextType: readNullableString(row.hormonalContextType),
    chronicPainFlag: readNullableBoolean(row.chronicPainFlag),
    bodyRelationship: readNullableString(row.bodyRelationship),
    substancePatternSignal: readNullableString(row.substancePatternSignal),
    purposeClarity: readNullableString(row.purposeClarity),
    spiritualFrameworkPresent: readNullableBoolean(row.spiritualFrameworkPresent),
    spiritualFrameworkType: readNullableString(row.spiritualFrameworkType),
    belongingLevel: readNullableString(row.belongingLevel),
    pressureReach: readNullableString(row.pressureReach),
  };

  return {
    firstName: typeof row.firstName === "string" ? row.firstName : undefined,
    roleType: typeof row.roleType === "string" ? row.roleType : undefined,
    primaryPillar: typeof row.primaryPillar === "string" ? row.primaryPillar : undefined,
    tier: typeof row.tier === "string" ? row.tier : null,
    subscribed: row.subscribed === true,
    results: asRecord(row.results),
    onboardingData,
    liveContext,
    aboutYou: hasAboutYou ? aboutYou : null,
    moduleProfile,
  };
}
