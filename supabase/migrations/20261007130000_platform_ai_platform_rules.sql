-- OVR-071: short admin "Platform rules" with top priority, separate from the coaching base
-- prompt in "globalSystemPrompt" (OVR-070). Additive only; existing RLS policies cover the column.

ALTER TABLE public."platformAiSettings"
  ADD COLUMN IF NOT EXISTS "platformRules" text NOT NULL DEFAULT ''
  CONSTRAINT "platformAiSettings_platformRules_check" CHECK (char_length("platformRules") <= 8000);
