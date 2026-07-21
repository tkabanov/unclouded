import { useMemo } from "react";

import CustomerRoleChipGroup from "@/components/CustomerRoleChipGroup";
import type { CustomerRoleSlug } from "@/lib/enums/customerProfile";
import { toggleCustomerRoleSelection } from "@/lib/enums/customerRoleTypes";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ABOUT_YOU_FIELD_COUNT,
  AGE_RANGE_LABELS,
  AGE_RANGE_ORDER,
  CAREER_STAGE_LABELS,
  CAREER_STAGE_ORDER,
  CHRONIC_HEALTH_CONDITION_LABELS,
  CHRONIC_HEALTH_CONDITION_ORDER,
  COMPANY_SIZE_LABELS,
  COMPANY_SIZE_ORDER,
  countCompletedAboutYouFields,
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_STATUS_ORDER,
  GENDER_IDENTITY,
  GENDER_IDENTITY_LABELS,
  GENDER_IDENTITY_ORDER,
  GENDER_SELF_DESCRIBE_VALUE,
  getTimeZoneOptions,
  INDUSTRY_LABELS,
  INDUSTRY_ORDER,
  INTERNATIONAL_STATE_VALUE,
  PARENTING_STATUS_LABELS,
  PARENTING_STATUS_ORDER,
  PHYSICAL_ACTIVITY_LEVEL_LABELS,
  PHYSICAL_ACTIVITY_LEVEL_ORDER,
  RELATIONSHIP_STATUS_LABELS,
  RELATIONSHIP_STATUS_ORDER,
  US_STATE_OPTIONS,
  WORK_ENVIRONMENT_LABELS,
  WORK_ENVIRONMENT_ORDER,
} from "@/lib/enums/aboutYouProfile";
import type { AboutYouFormState } from "@/lib/settings/profileApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

const EMPTY_SELECT_VALUE = "__empty__";

interface SettingsAboutYouSectionProps {
  form: AboutYouFormState;
  roleTypes: CustomerRoleSlug[];
  onRoleTypesChange: (roles: CustomerRoleSlug[]) => void;
  onChange: <K extends keyof AboutYouFormState>(key: K, value: AboutYouFormState[K]) => void;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}

function ProfileSelectField({
  id,
  label,
  value,
  placeholder,
  options,
  onChange,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className={bubbleStyle("Text_label_")}>
        {label}
      </Label>
      <Select
        value={value || EMPTY_SELECT_VALUE}
        onValueChange={(next) => onChange(next === EMPTY_SELECT_VALUE ? "" : next)}
      >
        <SelectTrigger id={id} className={bubbleStyle("Input_default_")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_SELECT_VALUE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h3 className={cn(bubbleStyle("Text_body_"), "text-sm font-semibold text-foreground")}>
      {children}
    </h3>
  );
}

export default function SettingsAboutYouSection({
  form,
  roleTypes,
  onRoleTypesChange,
  onChange,
}: SettingsAboutYouSectionProps) {
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);

  const completedCount = useMemo(
    () =>
      countCompletedAboutYouFields({
        ageRange: form.ageRange,
        careerStage: form.careerStage,
        genderIdentity:
          form.genderIdentity === GENDER_SELF_DESCRIBE_VALUE
            ? form.genderIdentityCustom
            : form.genderIdentity,
        employmentStatus: form.employmentStatus,
        industry: form.industry,
        companySize: form.companySize,
        workEnvironment: form.workEnvironment,
        managesATeam: form.managesATeam,
        relationshipStatus: form.relationshipStatus,
        parentingStatus: form.parentingStatus,
        chronicHealthCondition: form.chronicHealthCondition,
        physicalActivityLevel: form.physicalActivityLevel,
        stateRegion:
          form.stateRegion === INTERNATIONAL_STATE_VALUE
            ? form.stateRegionCustom || form.stateRegion
            : form.stateRegion,
        timeZone: form.timeZone,
      }),
    [form],
  );

  const genderOptions = GENDER_IDENTITY_ORDER.map((slug) => ({
    value: slug,
    label:
      slug === GENDER_SELF_DESCRIBE_VALUE
        ? "Prefer to self-describe"
        : GENDER_IDENTITY_LABELS[slug as keyof typeof GENDER_IDENTITY_LABELS],
  }));

  const stateOptions = [
    ...US_STATE_OPTIONS,
    { value: INTERNATIONAL_STATE_VALUE, label: "International" },
  ];

  return (
    <div className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-6 p-6")}>
      <header className="space-y-1">
        <h2 className={bubbleStyle("Text_heading_2_")}>About You</h2>
        <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
          Help your coach understand your world. The more context you share, the more your coaching
          experience is tailored to your actual life. All fields are optional and can be updated
          anytime.
        </p>
        <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
          Profile {completedCount} of {ABOUT_YOU_FIELD_COUNT} fields complete
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <SectionHeading>Life Stage</SectionHeading>
        <div className="flex flex-col gap-2">
          <Label className={bubbleStyle("Text_label_")}>Current roles</Label>
          <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
            Select all that apply — the same roles you chose during onboarding.
          </p>
          <CustomerRoleChipGroup
            selected={roleTypes}
            onToggle={(slug) =>
              onRoleTypesChange(toggleCustomerRoleSelection(roleTypes, slug))
            }
            className="max-w-none mx-0"
          />
        </div>
        <ProfileSelectField
          id="about-age-range"
          label="Age range"
          value={form.ageRange}
          placeholder="Select age range"
          options={AGE_RANGE_ORDER.map((value) => ({ value, label: AGE_RANGE_LABELS[value] }))}
          onChange={(value) => onChange("ageRange", value)}
        />
        <ProfileSelectField
          id="about-career-stage"
          label="Career stage"
          value={form.careerStage}
          placeholder="Select career stage"
          options={CAREER_STAGE_ORDER.map((value) => ({
            value,
            label: CAREER_STAGE_LABELS[value],
          }))}
          onChange={(value) => onChange("careerStage", value)}
        />
        <ProfileSelectField
          id="about-gender-identity"
          label="Gender identity"
          value={form.genderIdentity}
          placeholder="Select gender identity"
          options={genderOptions}
          onChange={(value) => onChange("genderIdentity", value)}
        />
        {form.genderIdentity === GENDER_IDENTITY.SELF_DESCRIBE ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="about-gender-custom" className={bubbleStyle("Text_label_")}>
              Self-describe
            </Label>
            <Input
              id="about-gender-custom"
              className={bubbleStyle("Input_default_")}
              placeholder="How you identify"
              value={form.genderIdentityCustom}
              maxLength={120}
              onChange={(event) => onChange("genderIdentityCustom", event.target.value)}
            />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-4">
        <SectionHeading>Work</SectionHeading>
        <ProfileSelectField
          id="about-employment-status"
          label="Employment status"
          value={form.employmentStatus}
          placeholder="Select employment status"
          options={EMPLOYMENT_STATUS_ORDER.map((value) => ({
            value,
            label: EMPLOYMENT_STATUS_LABELS[value],
          }))}
          onChange={(value) => onChange("employmentStatus", value)}
        />
        <ProfileSelectField
          id="about-industry"
          label="Industry"
          value={form.industry}
          placeholder="Select industry"
          options={INDUSTRY_ORDER.map((value) => ({ value, label: INDUSTRY_LABELS[value] }))}
          onChange={(value) => onChange("industry", value)}
        />
        <ProfileSelectField
          id="about-company-size"
          label="Company size"
          value={form.companySize}
          placeholder="Select company size"
          options={COMPANY_SIZE_ORDER.map((value) => ({
            value,
            label: COMPANY_SIZE_LABELS[value],
          }))}
          onChange={(value) => onChange("companySize", value)}
        />
        <ProfileSelectField
          id="about-work-environment"
          label="Work environment"
          value={form.workEnvironment}
          placeholder="Select work environment"
          options={WORK_ENVIRONMENT_ORDER.map((value) => ({
            value,
            label: WORK_ENVIRONMENT_LABELS[value],
          }))}
          onChange={(value) => onChange("workEnvironment", value)}
        />
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="about-manages-team" className={bubbleStyle("Text_label_")}>
              Manages a team
            </Label>
            <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
              Yes — I manage direct reports
            </p>
          </div>
          <Switch
            id="about-manages-team"
            checked={form.managesATeam === true}
            onCheckedChange={(checked) => onChange("managesATeam", checked ? true : false)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-4">
        <SectionHeading>Family and Relationships</SectionHeading>
        <ProfileSelectField
          id="about-relationship-status"
          label="Relationship status"
          value={form.relationshipStatus}
          placeholder="Select relationship status"
          options={RELATIONSHIP_STATUS_ORDER.map((value) => ({
            value,
            label: RELATIONSHIP_STATUS_LABELS[value],
          }))}
          onChange={(value) => onChange("relationshipStatus", value)}
        />
        <ProfileSelectField
          id="about-parenting-status"
          label="Parenting status"
          value={form.parentingStatus}
          placeholder="Select parenting status"
          options={PARENTING_STATUS_ORDER.map((value) => ({
            value,
            label: PARENTING_STATUS_LABELS[value],
          }))}
          onChange={(value) => onChange("parentingStatus", value)}
        />
        <ProfileSelectField
          id="about-chronic-health"
          label="Chronic health condition"
          value={form.chronicHealthCondition}
          placeholder="Select an option"
          options={CHRONIC_HEALTH_CONDITION_ORDER.map((value) => ({
            value,
            label: CHRONIC_HEALTH_CONDITION_LABELS[value],
          }))}
          onChange={(value) => onChange("chronicHealthCondition", value)}
        />
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-4">
        <SectionHeading>Health</SectionHeading>
        <ProfileSelectField
          id="about-physical-activity"
          label="Physical activity level"
          value={form.physicalActivityLevel}
          placeholder="Select activity level"
          options={PHYSICAL_ACTIVITY_LEVEL_ORDER.map((value) => ({
            value,
            label: PHYSICAL_ACTIVITY_LEVEL_LABELS[value],
          }))}
          onChange={(value) => onChange("physicalActivityLevel", value)}
        />
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-4">
        <SectionHeading>Location</SectionHeading>
        <ProfileSelectField
          id="about-state-region"
          label="State / region"
          value={form.stateRegion}
          placeholder="Select state or region"
          options={stateOptions}
          onChange={(value) => onChange("stateRegion", value)}
        />
        {form.stateRegion === INTERNATIONAL_STATE_VALUE ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="about-state-custom" className={bubbleStyle("Text_label_")}>
              Country or region
            </Label>
            <Input
              id="about-state-custom"
              className={bubbleStyle("Input_default_")}
              placeholder="Where you are located"
              value={form.stateRegionCustom}
              maxLength={120}
              onChange={(event) => onChange("stateRegionCustom", event.target.value)}
            />
          </div>
        ) : null}
        <ProfileSelectField
          id="about-time-zone"
          label="Time zone"
          value={form.timeZone}
          placeholder="Select time zone"
          options={timeZoneOptions.map((zone) => ({ value: zone, label: zone.replace(/_/g, " ") }))}
          onChange={(value) => onChange("timeZone", value)}
        />
        {form.timeZone ? (
          <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
            Your time zone is used for check-in reminders and notifications.
          </p>
        ) : null}
      </section>
    </div>
  );
}
