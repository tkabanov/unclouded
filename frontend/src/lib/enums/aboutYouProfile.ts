/** Uncloud360 Profile Fields spec — About You dropdown options */

export const GENDER_SELF_DESCRIBE_VALUE = "prefer_to_self_describe" as const;
export const GENDER_PREFER_NOT_TO_SAY_VALUE = "prefer_not_to_say" as const;
export const INTERNATIONAL_STATE_VALUE = "international" as const;

export const ABOUT_YOU_FIELD_COUNT = 14 as const;

// --- Life Stage ---

export const AGE_RANGE = {
  UNDER_25: "under_25",
  AGE_25_34: "25_34",
  AGE_35_44: "35_44",
  AGE_45_54: "45_54",
  AGE_55_64: "55_64",
  AGE_65_PLUS: "65_plus",
} as const;

export type AgeRangeSlug = (typeof AGE_RANGE)[keyof typeof AGE_RANGE];

export const AGE_RANGE_LABELS: Record<AgeRangeSlug, string> = {
  under_25: "Under 25",
  "25_34": "25–34",
  "35_44": "35–44",
  "45_54": "45–54",
  "55_64": "55–64",
  "65_plus": "65+",
};

export const AGE_RANGE_ORDER: readonly AgeRangeSlug[] = [
  AGE_RANGE.UNDER_25,
  AGE_RANGE.AGE_25_34,
  AGE_RANGE.AGE_35_44,
  AGE_RANGE.AGE_45_54,
  AGE_RANGE.AGE_55_64,
  AGE_RANGE.AGE_65_PLUS,
];

export const CAREER_STAGE = {
  EARLY: "early_career",
  MID: "mid_career",
  SENIOR: "senior_leadership",
  TRANSITION: "career_transition",
  SEMI_RETIRED: "semi_retired",
  RETIRED: "retired",
  STUDENT: "student",
  NOT_APPLICABLE: "not_applicable",
} as const;

export type CareerStageSlug = (typeof CAREER_STAGE)[keyof typeof CAREER_STAGE];

export const CAREER_STAGE_LABELS: Record<CareerStageSlug, string> = {
  early_career: "Early Career (0–5 yrs)",
  mid_career: "Mid-Career",
  senior_leadership: "Senior/Leadership",
  career_transition: "Career Transition",
  semi_retired: "Semi-Retired",
  retired: "Retired",
  student: "Student",
  not_applicable: "Not Applicable",
};

export const CAREER_STAGE_ORDER: readonly CareerStageSlug[] = [
  CAREER_STAGE.EARLY,
  CAREER_STAGE.MID,
  CAREER_STAGE.SENIOR,
  CAREER_STAGE.TRANSITION,
  CAREER_STAGE.SEMI_RETIRED,
  CAREER_STAGE.RETIRED,
  CAREER_STAGE.STUDENT,
  CAREER_STAGE.NOT_APPLICABLE,
];

export const GENDER_IDENTITY = {
  MAN: "man",
  WOMAN: "woman",
  NON_BINARY: "non_binary",
  SELF_DESCRIBE: GENDER_SELF_DESCRIBE_VALUE,
  PREFER_NOT_TO_SAY: GENDER_PREFER_NOT_TO_SAY_VALUE,
} as const;

export type GenderIdentitySlug = (typeof GENDER_IDENTITY)[keyof typeof GENDER_IDENTITY];

export const GENDER_IDENTITY_LABELS: Record<
  Exclude<GenderIdentitySlug, typeof GENDER_SELF_DESCRIBE_VALUE>,
  string
> = {
  man: "Man",
  woman: "Woman",
  non_binary: "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

export const GENDER_IDENTITY_ORDER: readonly GenderIdentitySlug[] = [
  GENDER_IDENTITY.MAN,
  GENDER_IDENTITY.WOMAN,
  GENDER_IDENTITY.NON_BINARY,
  GENDER_IDENTITY.SELF_DESCRIBE,
  GENDER_IDENTITY.PREFER_NOT_TO_SAY,
];

// --- Work Context ---

export const EMPLOYMENT_STATUS = {
  FULL_TIME: "employed_full_time",
  PART_TIME: "employed_part_time",
  SELF_EMPLOYED: "self_employed",
  BETWEEN_ROLES: "between_roles",
  STUDENT: "student",
  CAREGIVER: "caregiver_full_time",
  RETIRED: "retired",
  OTHER: "other",
} as const;

export type EmploymentStatusSlug = (typeof EMPLOYMENT_STATUS)[keyof typeof EMPLOYMENT_STATUS];

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatusSlug, string> = {
  employed_full_time: "Employed full-time",
  employed_part_time: "Employed part-time",
  self_employed: "Self-employed",
  between_roles: "Between roles",
  student: "Student",
  caregiver_full_time: "Caregiver (full-time)",
  retired: "Retired",
  other: "Other",
};

export const EMPLOYMENT_STATUS_ORDER: readonly EmploymentStatusSlug[] = [
  EMPLOYMENT_STATUS.FULL_TIME,
  EMPLOYMENT_STATUS.PART_TIME,
  EMPLOYMENT_STATUS.SELF_EMPLOYED,
  EMPLOYMENT_STATUS.BETWEEN_ROLES,
  EMPLOYMENT_STATUS.STUDENT,
  EMPLOYMENT_STATUS.CAREGIVER,
  EMPLOYMENT_STATUS.RETIRED,
  EMPLOYMENT_STATUS.OTHER,
];

export const INDUSTRY = {
  HEALTHCARE: "healthcare",
  TECHNOLOGY: "technology",
  FINANCE: "finance",
  LEGAL: "legal",
  EDUCATION: "education",
  GOVERNMENT: "government_military",
  NON_PROFIT: "non_profit",
  RETAIL: "retail_hospitality",
  MANUFACTURING: "manufacturing",
  REAL_ESTATE: "real_estate",
  OTHER: "other",
} as const;

export type IndustrySlug = (typeof INDUSTRY)[keyof typeof INDUSTRY];

export const INDUSTRY_LABELS: Record<IndustrySlug, string> = {
  healthcare: "Healthcare",
  technology: "Technology",
  finance: "Finance",
  legal: "Legal",
  education: "Education",
  government_military: "Government or Military",
  non_profit: "Non-profit",
  retail_hospitality: "Retail or Hospitality",
  manufacturing: "Manufacturing",
  real_estate: "Real Estate",
  other: "Other",
};

export const INDUSTRY_ORDER: readonly IndustrySlug[] = [
  INDUSTRY.HEALTHCARE,
  INDUSTRY.TECHNOLOGY,
  INDUSTRY.FINANCE,
  INDUSTRY.LEGAL,
  INDUSTRY.EDUCATION,
  INDUSTRY.GOVERNMENT,
  INDUSTRY.NON_PROFIT,
  INDUSTRY.RETAIL,
  INDUSTRY.MANUFACTURING,
  INDUSTRY.REAL_ESTATE,
  INDUSTRY.OTHER,
];

export const COMPANY_SIZE = {
  SOLO: "solo",
  FREELANCE: "freelance",
  SIZE_2_10: "2_10",
  SIZE_11_50: "11_50",
  SIZE_51_200: "51_200",
  SIZE_201_500: "201_500",
  SIZE_500_PLUS: "500_plus",
  NA: "na",
} as const;

export type CompanySizeSlug = (typeof COMPANY_SIZE)[keyof typeof COMPANY_SIZE];

export const COMPANY_SIZE_LABELS: Record<CompanySizeSlug, string> = {
  solo: "Solo",
  freelance: "Freelance",
  "2_10": "2–10",
  "11_50": "11–50",
  "51_200": "51–200",
  "201_500": "201–500",
  "500_plus": "500+",
  na: "N/A",
};

export const COMPANY_SIZE_ORDER: readonly CompanySizeSlug[] = [
  COMPANY_SIZE.SOLO,
  COMPANY_SIZE.FREELANCE,
  COMPANY_SIZE.SIZE_2_10,
  COMPANY_SIZE.SIZE_11_50,
  COMPANY_SIZE.SIZE_51_200,
  COMPANY_SIZE.SIZE_201_500,
  COMPANY_SIZE.SIZE_500_PLUS,
  COMPANY_SIZE.NA,
];

export const WORK_ENVIRONMENT = {
  REMOTE: "remote",
  HYBRID: "hybrid",
  IN_PERSON: "in_person",
  VARIES: "varies",
} as const;

export type WorkEnvironmentSlug = (typeof WORK_ENVIRONMENT)[keyof typeof WORK_ENVIRONMENT];

export const WORK_ENVIRONMENT_LABELS: Record<WorkEnvironmentSlug, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  in_person: "In-person",
  varies: "Varies",
};

export const WORK_ENVIRONMENT_ORDER: readonly WorkEnvironmentSlug[] = [
  WORK_ENVIRONMENT.REMOTE,
  WORK_ENVIRONMENT.HYBRID,
  WORK_ENVIRONMENT.IN_PERSON,
  WORK_ENVIRONMENT.VARIES,
];

// --- Family and Relationships ---

export const RELATIONSHIP_STATUS = {
  SINGLE: "single",
  IN_RELATIONSHIP: "in_relationship",
  MARRIED: "married_partnered",
  SEPARATED: "separated_divorcing",
  WIDOWED: "widowed",
  PREFER_NOT_TO_SAY: "prefer_not_to_say",
} as const;

export type RelationshipStatusSlug =
  (typeof RELATIONSHIP_STATUS)[keyof typeof RELATIONSHIP_STATUS];

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatusSlug, string> = {
  single: "Single",
  in_relationship: "In a relationship",
  married_partnered: "Married or partnered",
  separated_divorcing: "Separated or divorcing",
  widowed: "Widowed",
  prefer_not_to_say: "Prefer not to say",
};

export const RELATIONSHIP_STATUS_ORDER: readonly RelationshipStatusSlug[] = [
  RELATIONSHIP_STATUS.SINGLE,
  RELATIONSHIP_STATUS.IN_RELATIONSHIP,
  RELATIONSHIP_STATUS.MARRIED,
  RELATIONSHIP_STATUS.SEPARATED,
  RELATIONSHIP_STATUS.WIDOWED,
  RELATIONSHIP_STATUS.PREFER_NOT_TO_SAY,
];

export const PARENTING_STATUS = {
  NO_CHILDREN: "no_children",
  CHILDREN_AT_HOME: "children_at_home",
  ADULT_CHILDREN: "adult_children",
  AGING_PARENT: "aging_parent_care",
  MULTIPLE: "multiple",
} as const;

export type ParentingStatusSlug = (typeof PARENTING_STATUS)[keyof typeof PARENTING_STATUS];

export const PARENTING_STATUS_LABELS: Record<ParentingStatusSlug, string> = {
  no_children: "No children",
  children_at_home: "Children at home (under 18)",
  adult_children: "Children — adult or independent",
  aging_parent_care: "Caring for aging parent or family member",
  multiple: "Multiple of the above",
};

export const PARENTING_STATUS_ORDER: readonly ParentingStatusSlug[] = [
  PARENTING_STATUS.NO_CHILDREN,
  PARENTING_STATUS.CHILDREN_AT_HOME,
  PARENTING_STATUS.ADULT_CHILDREN,
  PARENTING_STATUS.AGING_PARENT,
  PARENTING_STATUS.MULTIPLE,
];

export const CHRONIC_HEALTH_CONDITION = {
  YES: "yes_affects_daily",
  OCCASIONALLY: "occasionally_manageable",
  NO: "no",
  PREFER_NOT_TO_SAY: "prefer_not_to_say",
} as const;

export type ChronicHealthConditionSlug =
  (typeof CHRONIC_HEALTH_CONDITION)[keyof typeof CHRONIC_HEALTH_CONDITION];

export const CHRONIC_HEALTH_CONDITION_LABELS: Record<ChronicHealthConditionSlug, string> = {
  yes_affects_daily: "Yes, this affects my daily life",
  occasionally_manageable: "Occasionally, but manageable",
  no: "No",
  prefer_not_to_say: "Prefer not to say",
};

export const CHRONIC_HEALTH_CONDITION_ORDER: readonly ChronicHealthConditionSlug[] = [
  CHRONIC_HEALTH_CONDITION.YES,
  CHRONIC_HEALTH_CONDITION.OCCASIONALLY,
  CHRONIC_HEALTH_CONDITION.NO,
  CHRONIC_HEALTH_CONDITION.PREFER_NOT_TO_SAY,
];

// --- Health ---

export const PHYSICAL_ACTIVITY_LEVEL = {
  SEDENTARY: "sedentary",
  LIGHTLY_ACTIVE: "lightly_active",
  MODERATELY_ACTIVE: "moderately_active",
  VERY_ACTIVE: "very_active",
} as const;

export type PhysicalActivityLevelSlug =
  (typeof PHYSICAL_ACTIVITY_LEVEL)[keyof typeof PHYSICAL_ACTIVITY_LEVEL];

export const PHYSICAL_ACTIVITY_LEVEL_LABELS: Record<PhysicalActivityLevelSlug, string> = {
  sedentary: "Sedentary (little to no regular movement)",
  lightly_active: "Lightly active",
  moderately_active: "Moderately active",
  very_active: "Very active",
};

export const PHYSICAL_ACTIVITY_LEVEL_ORDER: readonly PhysicalActivityLevelSlug[] = [
  PHYSICAL_ACTIVITY_LEVEL.SEDENTARY,
  PHYSICAL_ACTIVITY_LEVEL.LIGHTLY_ACTIVE,
  PHYSICAL_ACTIVITY_LEVEL.MODERATELY_ACTIVE,
  PHYSICAL_ACTIVITY_LEVEL.VERY_ACTIVE,
];

// --- Location ---

export const US_STATE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const FALLBACK_TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
] as const;

export function getTimeZoneOptions(): readonly string[] {
  try {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      const values = (Intl as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf(
        "timeZone",
      );
      if (Array.isArray(values) && values.length > 0) {
        return values;
      }
    }
  } catch {
    // fall through to static list
  }
  return FALLBACK_TIME_ZONES;
}

/** Stored About You profile values (DB shape). */
export interface AboutYouProfileValues {
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
}

const US_STATE_LABEL_BY_VALUE = new Map(US_STATE_OPTIONS.map((s) => [s.value, s.label]));

function isKnownGenderSlug(value: string): value is Exclude<GenderIdentitySlug, typeof GENDER_SELF_DESCRIBE_VALUE> {
  return value in GENDER_IDENTITY_LABELS;
}

export function resolveGenderIdentityDisplay(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;
  if (isKnownGenderSlug(stored)) return GENDER_IDENTITY_LABELS[stored];
  if (stored === GENDER_SELF_DESCRIBE_VALUE) return null;
  return stored;
}

export function resolveStateRegionDisplay(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;
  if (stored === INTERNATIONAL_STATE_VALUE) return "International";
  const stateLabel = US_STATE_LABEL_BY_VALUE.get(stored);
  if (stateLabel) return stateLabel;
  if (stored.startsWith("international:")) {
    const custom = stored.slice("international:".length).trim();
    return custom ? `International (${custom})` : "International";
  }
  return stored;
}

export function formatAboutYouFieldForContext(
  fieldKey: keyof AboutYouProfileValues,
  value: string | boolean | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") {
    if (fieldKey !== "managesATeam") return null;
    return value ? "Yes" : "No";
  }
  const trimmed = value.trim();
  if (!trimmed) return null;

  switch (fieldKey) {
    case "ageRange":
      return AGE_RANGE_LABELS[trimmed as AgeRangeSlug] ?? trimmed;
    case "careerStage":
      return CAREER_STAGE_LABELS[trimmed as CareerStageSlug] ?? trimmed;
    case "genderIdentity":
      return resolveGenderIdentityDisplay(trimmed);
    case "employmentStatus":
      return EMPLOYMENT_STATUS_LABELS[trimmed as EmploymentStatusSlug] ?? trimmed;
    case "industry":
      return INDUSTRY_LABELS[trimmed as IndustrySlug] ?? trimmed;
    case "companySize":
      return COMPANY_SIZE_LABELS[trimmed as CompanySizeSlug] ?? trimmed;
    case "workEnvironment":
      return WORK_ENVIRONMENT_LABELS[trimmed as WorkEnvironmentSlug] ?? trimmed;
    case "relationshipStatus":
      return RELATIONSHIP_STATUS_LABELS[trimmed as RelationshipStatusSlug] ?? trimmed;
    case "parentingStatus":
      return PARENTING_STATUS_LABELS[trimmed as ParentingStatusSlug] ?? trimmed;
    case "chronicHealthCondition":
      return CHRONIC_HEALTH_CONDITION_LABELS[trimmed as ChronicHealthConditionSlug] ?? trimmed;
    case "physicalActivityLevel":
      return PHYSICAL_ACTIVITY_LEVEL_LABELS[trimmed as PhysicalActivityLevelSlug] ?? trimmed;
    case "stateRegion":
      return resolveStateRegionDisplay(trimmed);
    case "timeZone":
      return trimmed.replace(/_/g, " ");
    case "managesATeam":
      return null;
    default: {
      const _exhaustive: never = fieldKey;
      return _exhaustive;
    }
  }
}

const CONTEXT_FIELD_LABELS: Record<keyof AboutYouProfileValues, string> = {
  ageRange: "age range",
  careerStage: "career stage",
  genderIdentity: "gender identity",
  employmentStatus: "employment status",
  industry: "industry",
  companySize: "company size",
  workEnvironment: "work environment",
  managesATeam: "manages a team",
  relationshipStatus: "relationship status",
  parentingStatus: "parenting status",
  chronicHealthCondition: "chronic health condition",
  physicalActivityLevel: "physical activity level",
  stateRegion: "state/region",
  timeZone: "timezone",
};

export function buildAboutYouContextLine(values: AboutYouProfileValues): string | null {
  const parts: string[] = [];

  for (const key of Object.keys(CONTEXT_FIELD_LABELS) as (keyof AboutYouProfileValues)[]) {
    const display = formatAboutYouFieldForContext(key, values[key] ?? null);
    if (display) {
      parts.push(`${CONTEXT_FIELD_LABELS[key]} ${display}`);
    }
  }

  if (parts.length === 0) return null;
  return `User context: ${parts.join(", ")}.`;
}

export function countCompletedAboutYouFields(values: AboutYouProfileValues): number {
  let count = 0;
  if (values.ageRange?.trim()) count += 1;
  if (values.careerStage?.trim()) count += 1;
  if (values.genderIdentity?.trim()) count += 1;
  if (values.employmentStatus?.trim()) count += 1;
  if (values.industry?.trim()) count += 1;
  if (values.companySize?.trim()) count += 1;
  if (values.workEnvironment?.trim()) count += 1;
  if (values.managesATeam !== null && values.managesATeam !== undefined) count += 1;
  if (values.relationshipStatus?.trim()) count += 1;
  if (values.parentingStatus?.trim()) count += 1;
  if (values.chronicHealthCondition?.trim()) count += 1;
  if (values.physicalActivityLevel?.trim()) count += 1;
  if (values.stateRegion?.trim()) count += 1;
  if (values.timeZone?.trim()) count += 1;
  return count;
}

export function splitGenderIdentityForForm(stored: string | null | undefined): {
  genderIdentity: string;
  genderIdentityCustom: string;
} {
  if (!stored?.trim()) return { genderIdentity: "", genderIdentityCustom: "" };
  if (stored === GENDER_SELF_DESCRIBE_VALUE) {
    return { genderIdentity: GENDER_SELF_DESCRIBE_VALUE, genderIdentityCustom: "" };
  }
  if (isKnownGenderSlug(stored) || stored === GENDER_PREFER_NOT_TO_SAY_VALUE) {
    return { genderIdentity: stored, genderIdentityCustom: "" };
  }
  return { genderIdentity: GENDER_SELF_DESCRIBE_VALUE, genderIdentityCustom: stored };
}

export function splitStateRegionForForm(stored: string | null | undefined): {
  stateRegion: string;
  stateRegionCustom: string;
} {
  if (!stored?.trim()) return { stateRegion: "", stateRegionCustom: "" };
  if (stored === INTERNATIONAL_STATE_VALUE) {
    return { stateRegion: INTERNATIONAL_STATE_VALUE, stateRegionCustom: "" };
  }
  if (stored.startsWith("international:")) {
    return {
      stateRegion: INTERNATIONAL_STATE_VALUE,
      stateRegionCustom: stored.slice("international:".length),
    };
  }
  if (US_STATE_LABEL_BY_VALUE.has(stored)) {
    return { stateRegion: stored, stateRegionCustom: "" };
  }
  return { stateRegion: INTERNATIONAL_STATE_VALUE, stateRegionCustom: stored };
}

export function mergeGenderIdentityForSave(
  genderIdentity: string,
  genderIdentityCustom: string,
): string | null {
  if (!genderIdentity.trim()) return null;
  if (genderIdentity === GENDER_SELF_DESCRIBE_VALUE) {
    const custom = genderIdentityCustom.trim();
    return custom || null;
  }
  return genderIdentity;
}

export function mergeStateRegionForSave(
  stateRegion: string,
  stateRegionCustom: string,
): string | null {
  if (!stateRegion.trim()) return null;
  if (stateRegion === INTERNATIONAL_STATE_VALUE) {
    const custom = stateRegionCustom.trim();
    return custom ? `international:${custom}` : INTERNATIONAL_STATE_VALUE;
  }
  return stateRegion;
}
