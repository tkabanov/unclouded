-- About You profile fields (Uncloud360 Profile Fields spec Part 1)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "ageRange" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "careerStage" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "genderIdentity" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "employmentStatus" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "industry" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "companySize" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "workEnvironment" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "managesATeam" BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS "relationshipStatus" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "parentingStatus" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "chronicHealthCondition" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "physicalActivityLevel" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "stateRegion" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "timeZone" TEXT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_time_zone TEXT;
BEGIN
  v_time_zone := COALESCE(
    NEW.raw_user_meta_data ->> 'time_zone',
    NEW.raw_user_meta_data ->> 'timezone'
  );

  INSERT INTO public.profiles (id, email, "firstName", "lastName", "timeZone")
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NULLIF(TRIM(v_time_zone), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
