-- Deep-dive module fields on profiles (Build Brief section 9, deep-dive-modules-spec.md section 2)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "modulesCompletedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "moduleIdentityComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moduleRelationalComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moduleHistoryComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moduleFinancialComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moduleBodyComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moduleMeaningComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moduleSchedules" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "identitySelfWorthSource" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "identityNarrativeType" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "identityRoleFusionScore" INTEGER NULL,
  ADD COLUMN IF NOT EXISTS "identityPressureOrigin" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "attachmentSignal" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "conflictPattern" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "supportSeekingCapacity" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "intimacySafetyLevel" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "traumaActivationLevel" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "griefLoadLevel" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "priorSupportType" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "significantEvents12mo" JSONB NULL,
  ADD COLUMN IF NOT EXISTS "financialStabilitySignal" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "financialAnxietyLevel" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "financialAgencyLevel" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "sleepQualitySignal" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "hormonalContextFlag" BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS "hormonalContextType" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "chronicPainFlag" BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS "bodyRelationship" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "substancePatternSignal" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "purposeClarity" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "spiritualFrameworkPresent" BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS "spiritualFrameworkType" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "belongingLevel" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "pressureReach" TEXT NULL;

UPDATE public.profiles
SET "modulesCompletedCount" = COALESCE(
  NULLIF(("onboardingData"->>'modules_completed_count_number')::integer, 0),
  NULLIF(("onboardingData"->>'modules_completed_count')::integer, 0),
  0
)
WHERE "onboardingData" IS NOT NULL
  AND (
    ("onboardingData"->>'modules_completed_count_number') IS NOT NULL
    OR ("onboardingData"->>'modules_completed_count') IS NOT NULL
  );
