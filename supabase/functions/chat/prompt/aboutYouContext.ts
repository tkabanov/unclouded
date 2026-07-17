import { sanitizePromptField } from "./profileHelpers.ts";
import type { AboutYouProfileData } from "./types.ts";

const AGE_RANGE_LABELS: Record<string, string> = {
  under_25: "Under 25",
  "25_34": "25–34",
  "35_44": "35–44",
  "45_54": "45–54",
  "55_64": "55–64",
  "65_plus": "65+",
};

const CAREER_STAGE_LABELS: Record<string, string> = {
  early_career: "Early Career (0–5 yrs)",
  mid_career: "Mid-Career",
  senior_leadership: "Senior/Leadership",
  career_transition: "Career Transition",
  semi_retired: "Semi-Retired",
  retired: "Retired",
  student: "Student",
  not_applicable: "Not Applicable",
};

const GENDER_IDENTITY_LABELS: Record<string, string> = {
  man: "Man",
  woman: "Woman",
  non_binary: "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  employed_full_time: "Employed full-time",
  employed_part_time: "Employed part-time",
  self_employed: "Self-employed",
  between_roles: "Between roles",
  student: "Student",
  caregiver_full_time: "Caregiver (full-time)",
  retired: "Retired",
  other: "Other",
};

const INDUSTRY_LABELS: Record<string, string> = {
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

const COMPANY_SIZE_LABELS: Record<string, string> = {
  solo: "Solo",
  freelance: "Freelance",
  "2_10": "2–10",
  "11_50": "11–50",
  "51_200": "51–200",
  "201_500": "201–500",
  "500_plus": "500+",
  na: "N/A",
};

const WORK_ENVIRONMENT_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  in_person: "In-person",
  varies: "Varies",
};

const RELATIONSHIP_STATUS_LABELS: Record<string, string> = {
  single: "Single",
  in_relationship: "In a relationship",
  married_partnered: "Married or partnered",
  separated_divorcing: "Separated or divorcing",
  widowed: "Widowed",
  prefer_not_to_say: "Prefer not to say",
};

const PARENTING_STATUS_LABELS: Record<string, string> = {
  no_children: "No children",
  children_at_home: "Children at home (under 18)",
  adult_children: "Children — adult or independent",
  aging_parent_care: "Caring for aging parent or family member",
  multiple: "Multiple of the above",
};

const CHRONIC_HEALTH_LABELS: Record<string, string> = {
  yes_affects_daily: "Yes, this affects my daily life",
  occasionally_manageable: "Occasionally, but manageable",
  no: "No",
  prefer_not_to_say: "Prefer not to say",
};

const PHYSICAL_ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary (little to no regular movement)",
  lightly_active: "Lightly active",
  moderately_active: "Moderately active",
  very_active: "Very active",
};

const US_STATE_LABELS: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const CONTEXT_FIELD_LABELS: Record<keyof AboutYouProfileData, string> = {
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

function resolveGenderDisplay(stored: string): string {
  if (stored in GENDER_IDENTITY_LABELS) return GENDER_IDENTITY_LABELS[stored] ?? stored;
  if (stored === "prefer_to_self_describe") return stored;
  return stored;
}

function resolveStateDisplay(stored: string): string {
  if (stored === "international") return "International";
  if (stored in US_STATE_LABELS) return US_STATE_LABELS[stored] ?? stored;
  if (stored.startsWith("international:")) {
    const custom = stored.slice("international:".length).trim();
    return custom ? `International (${custom})` : "International";
  }
  return stored;
}

function formatFieldValue(
  key: keyof AboutYouProfileData,
  value: string | boolean | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "boolean") {
    if (key !== "managesATeam") return null;
    return value ? "Yes" : "No";
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  let display: string;
  switch (key) {
    case "ageRange":
      display = AGE_RANGE_LABELS[trimmed] ?? trimmed;
      break;
    case "careerStage":
      display = CAREER_STAGE_LABELS[trimmed] ?? trimmed;
      break;
    case "genderIdentity":
      display = resolveGenderDisplay(trimmed);
      break;
    case "employmentStatus":
      display = EMPLOYMENT_STATUS_LABELS[trimmed] ?? trimmed;
      break;
    case "industry":
      display = INDUSTRY_LABELS[trimmed] ?? trimmed;
      break;
    case "companySize":
      display = COMPANY_SIZE_LABELS[trimmed] ?? trimmed;
      break;
    case "workEnvironment":
      display = WORK_ENVIRONMENT_LABELS[trimmed] ?? trimmed;
      break;
    case "relationshipStatus":
      display = RELATIONSHIP_STATUS_LABELS[trimmed] ?? trimmed;
      break;
    case "parentingStatus":
      display = PARENTING_STATUS_LABELS[trimmed] ?? trimmed;
      break;
    case "chronicHealthCondition":
      display = CHRONIC_HEALTH_LABELS[trimmed] ?? trimmed;
      break;
    case "physicalActivityLevel":
      display = PHYSICAL_ACTIVITY_LABELS[trimmed] ?? trimmed;
      break;
    case "stateRegion":
      display = resolveStateDisplay(trimmed);
      break;
    case "timeZone":
      display = trimmed.replace(/_/g, " ");
      break;
    case "managesATeam":
      return null;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }

  return sanitizePromptField(display, 120) || null;
}

export function buildAboutYouContextBlock(
  aboutYou: AboutYouProfileData | null | undefined,
): string | null {
  if (!aboutYou) return null;

  const parts: string[] = [];
  for (const key of Object.keys(CONTEXT_FIELD_LABELS) as (keyof AboutYouProfileData)[]) {
    const display = formatFieldValue(key, aboutYou[key] ?? null);
    if (display) {
      parts.push(`${CONTEXT_FIELD_LABELS[key]} ${display}`);
    }
  }

  if (parts.length === 0) return null;
  return `User context: ${parts.join(", ")}.`;
}
