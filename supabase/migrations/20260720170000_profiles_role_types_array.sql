-- Customer roles: multi-select stored in roleTypes; roleType kept as primary slug for legacy readers.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "roleTypes" text[] NOT NULL DEFAULT '{}';

UPDATE public.profiles
SET "roleTypes" = ARRAY["roleType"]
WHERE "roleType" IS NOT NULL
  AND "roleType" <> 'admin'
  AND cardinality("roleTypes") = 0;
