-- Prompt Library addendum schema: memory facts, session types, pulse baseline, coach booking.

-- ---------------------------------------------------------------------------
-- userMemoryFacts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."userMemoryFacts" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  "peopleInLife" TEXT NULL,
  "userLanguage" TEXT NULL,
  "openAvoidances" TEXT NULL,
  "userInsights" TEXT NULL,
  "statedGoals" TEXT NULL,
  "lastUpdated" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_memory_facts_user
  ON public."userMemoryFacts" ("userId");

ALTER TABLE public."userMemoryFacts" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public."userMemoryFacts" TO authenticated;
GRANT ALL ON public."userMemoryFacts" TO service_role;

DROP POLICY IF EXISTS "Owner selects userMemoryFacts" ON public."userMemoryFacts";
CREATE POLICY "Owner selects userMemoryFacts" ON public."userMemoryFacts"
  FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner inserts userMemoryFacts" ON public."userMemoryFacts";
CREATE POLICY "Owner inserts userMemoryFacts" ON public."userMemoryFacts"
  FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner updates userMemoryFacts" ON public."userMemoryFacts";
CREATE POLICY "Owner updates userMemoryFacts" ON public."userMemoryFacts"
  FOR UPDATE TO authenticated
  USING (public.userOwnsRow("userId"))
  WITH CHECK (public.userOwnsRow("userId"));

DROP TRIGGER IF EXISTS update_user_memory_facts_updated_at ON public."userMemoryFacts";
CREATE TRIGGER update_user_memory_facts_updated_at
  BEFORE UPDATE ON public."userMemoryFacts"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- chatConversation: session type + crisis escalation flag
-- ---------------------------------------------------------------------------
ALTER TABLE public."chatConversation"
  ADD COLUMN IF NOT EXISTS "sessionType" TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS "hadCrisisEscalation" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public."chatConversation"
  DROP CONSTRAINT IF EXISTS chat_conversation_session_type_check;

ALTER TABLE public."chatConversation"
  ADD CONSTRAINT chat_conversation_session_type_check
  CHECK ("sessionType" IN ('text', 'voice', 'quick_checkin'));

-- ---------------------------------------------------------------------------
-- profiles: pulse baseline, outreach, referral, manager opt-in
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "hasPriorCrisisSession" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "pulseBaseline" NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS "significantPulseDrop" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "vulnerableOutreachEmailedAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "referralCode" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "managerAggregateOptIn" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code
  ON public.profiles ("referralCode")
  WHERE "referralCode" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- coachBooking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."coachBooking" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "scheduledAt" TIMESTAMPTZ NULL,
  status TEXT NULL,
  "kotaRead" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_booking_user_scheduled
  ON public."coachBooking" ("userId", "scheduledAt" DESC);

ALTER TABLE public."coachBooking" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public."coachBooking" TO authenticated;
GRANT ALL ON public."coachBooking" TO service_role;

DROP POLICY IF EXISTS "Owner selects coachBooking" ON public."coachBooking";
CREATE POLICY "Owner selects coachBooking" ON public."coachBooking"
  FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner inserts coachBooking" ON public."coachBooking";
CREATE POLICY "Owner inserts coachBooking" ON public."coachBooking"
  FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));

DROP TRIGGER IF EXISTS update_coach_booking_updated_at ON public."coachBooking";
CREATE TRIGGER update_coach_booking_updated_at
  BEFORE UPDATE ON public."coachBooking"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
