import { z } from "zod";

import {
  mergeGenderIdentityForSave,
  mergeStateRegionForSave,
  splitGenderIdentityForForm,
  splitStateRegionForForm,
} from "@/lib/enums/aboutYouProfile";
import { applyRoleTypeAboutYouPrefill } from "@/lib/settings/roleTypeAboutYouPrefill";
import { supabase } from "@/integrations/supabase/client";

const SOBRIETY_DATE_KEY = "sobriety_start_date";

const ABOUT_YOU_SELECT =
  "ageRange, careerStage, genderIdentity, employmentStatus, industry, companySize, workEnvironment, managesATeam, relationshipStatus, parentingStatus, chronicHealthCondition, physicalActivityLevel, stateRegion, timeZone" as const;

const aboutYouCustomTextSchema = z.string().trim().max(120);

export interface ProfileFormState {
  firstName: string;
  lastName: string;
  sobrietyStartDate: string;
}

export interface AboutYouFormState {
  ageRange: string;
  careerStage: string;
  genderIdentity: string;
  genderIdentityCustom: string;
  employmentStatus: string;
  industry: string;
  companySize: string;
  workEnvironment: string;
  managesATeam: boolean | null;
  relationshipStatus: string;
  parentingStatus: string;
  chronicHealthCondition: string;
  physicalActivityLevel: string;
  stateRegion: string;
  stateRegionCustom: string;
  timeZone: string;
}

export const EMPTY_ABOUT_YOU_FORM: AboutYouFormState = {
  ageRange: "",
  careerStage: "",
  genderIdentity: "",
  genderIdentityCustom: "",
  employmentStatus: "",
  industry: "",
  companySize: "",
  workEnvironment: "",
  managesATeam: null,
  relationshipStatus: "",
  parentingStatus: "",
  chronicHealthCondition: "",
  physicalActivityLevel: "",
  stateRegion: "",
  stateRegionCustom: "",
  timeZone: "",
};

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

type AboutYouRow = {
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

type ProfileSettingsRow = AboutYouRow & {
  firstName?: string | null;
  lastName?: string | null;
  roleType?: string | null;
  onboardingData?: Record<string, unknown> | null;
};

function mapAboutYouRowToForm(row: AboutYouRow | null | undefined): AboutYouFormState {
  const gender = splitGenderIdentityForForm(row?.genderIdentity);
  const state = splitStateRegionForForm(row?.stateRegion);

  return {
    ageRange: row?.ageRange ?? "",
    careerStage: row?.careerStage ?? "",
    genderIdentity: gender.genderIdentity,
    genderIdentityCustom: gender.genderIdentityCustom,
    employmentStatus: row?.employmentStatus ?? "",
    industry: row?.industry ?? "",
    companySize: row?.companySize ?? "",
    workEnvironment: row?.workEnvironment ?? "",
    managesATeam: row?.managesATeam ?? null,
    relationshipStatus: row?.relationshipStatus ?? "",
    parentingStatus: row?.parentingStatus ?? "",
    chronicHealthCondition: row?.chronicHealthCondition ?? "",
    physicalActivityLevel: row?.physicalActivityLevel ?? "",
    stateRegion: state.stateRegion,
    stateRegionCustom: state.stateRegionCustom,
    timeZone: row?.timeZone ?? "",
  };
}

function mapAboutYouFromProfileRow(
  row: ProfileSettingsRow | null | undefined,
): AboutYouFormState {
  const aboutYou = mapAboutYouRowToForm(row);
  return applyRoleTypeAboutYouPrefill(aboutYou, row?.roleType);
}

function validateAboutYouCustomFields(values: AboutYouFormState): void {
  if (values.genderIdentityCustom.trim()) {
    aboutYouCustomTextSchema.parse(values.genderIdentityCustom);
  }
  if (values.stateRegionCustom.trim()) {
    aboutYouCustomTextSchema.parse(values.stateRegionCustom);
  }
}

function mapAboutYouFormToUpdate(values: AboutYouFormState): AboutYouRow {
  return {
    ageRange: trimOrNull(values.ageRange),
    careerStage: trimOrNull(values.careerStage),
    genderIdentity: mergeGenderIdentityForSave(values.genderIdentity, values.genderIdentityCustom),
    employmentStatus: trimOrNull(values.employmentStatus),
    industry: trimOrNull(values.industry),
    companySize: trimOrNull(values.companySize),
    workEnvironment: trimOrNull(values.workEnvironment),
    managesATeam: values.managesATeam,
    relationshipStatus: trimOrNull(values.relationshipStatus),
    parentingStatus: trimOrNull(values.parentingStatus),
    chronicHealthCondition: trimOrNull(values.chronicHealthCondition),
    physicalActivityLevel: trimOrNull(values.physicalActivityLevel),
    stateRegion: mergeStateRegionForSave(values.stateRegion, values.stateRegionCustom),
    timeZone: trimOrNull(values.timeZone),
  };
}

export async function loadProfileForm(userId: string): Promise<ProfileFormState> {
  const { data, error } = await supabase
    .from("profiles")
    .select("firstName, lastName, onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};

  return {
    firstName: data?.firstName ?? "",
    lastName: data?.lastName ?? "",
    sobrietyStartDate:
      typeof onboarding[SOBRIETY_DATE_KEY] === "string" ? onboarding[SOBRIETY_DATE_KEY] : "",
  };
}

export async function loadProfileSettingsForms(userId: string): Promise<{
  personal: ProfileFormState;
  aboutYou: AboutYouFormState;
}> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`firstName, lastName, roleType, onboardingData, ${ABOUT_YOU_SELECT}`)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};

  return {
    personal: {
      firstName: data?.firstName ?? "",
      lastName: data?.lastName ?? "",
      sobrietyStartDate:
        typeof onboarding[SOBRIETY_DATE_KEY] === "string" ? onboarding[SOBRIETY_DATE_KEY] : "",
    },
    aboutYou: mapAboutYouFromProfileRow(data as ProfileSettingsRow | null),
  };
}

export async function loadAboutYouForm(userId: string): Promise<AboutYouFormState> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`${ABOUT_YOU_SELECT}, roleType`)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return mapAboutYouFromProfileRow(data as ProfileSettingsRow | null);
}

export async function saveProfileForm(userId: string, values: ProfileFormState): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("firstName, lastName, onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const onboarding =
    (existing?.onboardingData as Record<string, unknown> | null | undefined) ?? {};

  const trimmedFirstName = values.firstName.trim();
  const trimmedLastName = values.lastName.trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      firstName: trimmedFirstName || existing?.firstName || null,
      lastName: trimmedLastName || existing?.lastName || null,
      onboardingData: {
        ...onboarding,
        [SOBRIETY_DATE_KEY]: values.sobrietyStartDate || null,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

export async function saveAboutYouForm(userId: string, values: AboutYouFormState): Promise<void> {
  validateAboutYouCustomFields(values);

  const { error } = await supabase
    .from("profiles")
    .update(mapAboutYouFormToUpdate(values) as never)
    .eq("id", userId);

  if (error) throw error;
}

export async function bootstrapTimeZoneIfEmpty(
  userId: string,
  detectedTimeZone: string | null,
): Promise<string | null> {
  if (!detectedTimeZone?.trim()) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("timeZone")
      .eq("id", userId)
      .maybeSingle();

    if (error) return null;
    if (data?.timeZone?.trim()) return data.timeZone;

    const zone = detectedTimeZone.trim();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ timeZone: zone })
      .eq("id", userId);

    if (updateError) return null;
    return zone;
  } catch {
    return null;
  }
}
