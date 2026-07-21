-- Coaching session archive — unbounded finalized session history (REQ-04 / REQ-16).

CREATE TABLE IF NOT EXISTS public."coachingSessionArchive" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "conversationId" UUID NULL REFERENCES public."chatConversation"(id) ON DELETE SET NULL,
  "sessionType" TEXT NOT NULL DEFAULT 'text'
    CHECK ("sessionType" IN ('text', 'voice', 'quick_checkin')),
  "finalizedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "exchangeCount" INTEGER NULL,
  "coachingModeUsed" TEXT NULL,
  "hadCrisisEscalation" BOOLEAN NOT NULL DEFAULT false,
  "classificationAtSession" TEXT NULL,
  "loadSignalsSnapshot" JSONB NULL,
  "summaryJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_session_archive_user_finalized
  ON public."coachingSessionArchive" ("userId", "finalizedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_coaching_session_archive_finalized
  ON public."coachingSessionArchive" ("finalizedAt");

ALTER TABLE public."coachingSessionArchive" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public."coachingSessionArchive" TO authenticated;
GRANT ALL ON public."coachingSessionArchive" TO service_role;

DROP POLICY IF EXISTS "Owner selects coachingSessionArchive" ON public."coachingSessionArchive";
CREATE POLICY "Owner selects coachingSessionArchive" ON public."coachingSessionArchive"
  FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));

ALTER TABLE public."chatConversation"
  ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conversation_user_finalized
  ON public."chatConversation" ("userId", "finalizedAt" DESC)
  WHERE "finalizedAt" IS NOT NULL;
