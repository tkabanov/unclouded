ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscribed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS reassessment_results jsonb,
  ADD COLUMN IF NOT EXISTS reassessment_data jsonb,
  ADD COLUMN IF NOT EXISTS reassessment_reflections jsonb,
  ADD COLUMN IF NOT EXISTS reassessment_completed_at timestamp with time zone;