-- Remove unused Bubble tables and consolidate duplicates:
--   journal_entries -> uds_journalentry (canonical journal store)
--   user -> profiles (streak fields already on profiles)
--   pathenrollment + guidedpath -> replaced by pathenrollment1 + path
--   checkintag, pathuseranswer, module -> not referenced by the app

-- Migrate legacy journal rows before drop (no-op when empty).
INSERT INTO public.uds_journalentry (
  id,
  user_user,
  title_text,
  mood_tag_text,
  content_text,
  created_at,
  updated_at
)
SELECT
  je.id,
  je.user_id,
  COALESCE(je.title, ''),
  je.mood,
  COALESCE(je.body, ''),
  je.created_at,
  je.updated_at
FROM public.journal_entries je
WHERE NOT EXISTS (
  SELECT 1 FROM public.uds_journalentry u WHERE u.id = je.id
);

-- Copy streak counters from Bubble user table into profiles.
UPDATE public.profiles p
SET
  daily_check_in_streak_number = COALESCE(
    u.daily_check_in_streak_number,
    p.daily_check_in_streak_number,
    0
  ),
  streak_days_number = COALESCE(
    u.streak_days_number,
    p.streak_days_number,
    0
  )
FROM public."user" u
WHERE p.id = u.id;

DROP TRIGGER IF EXISTS on_auth_user_created_bubble ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_bubble();

DROP TABLE IF EXISTS public.checkintag CASCADE;
DROP TABLE IF EXISTS public.pathenrollment CASCADE;
DROP TABLE IF EXISTS public.guidedpath CASCADE;
DROP TABLE IF EXISTS public.pathuseranswer CASCADE;
DROP TABLE IF EXISTS public.module CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;
DROP TABLE IF EXISTS public."user" CASCADE;
