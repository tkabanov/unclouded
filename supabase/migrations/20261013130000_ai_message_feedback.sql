-- NCLDD-55 (OVR-073): explicit 👍 / 👎 feedback on Kota replies (text and voice sessions),
-- plus the usage-ledger source for the Insights session classifier.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL. Additive only.

CREATE TABLE IF NOT EXISTS public."aiMessageFeedback" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "messageId" uuid NOT NULL REFERENCES public."chatMessage"(id) ON DELETE CASCADE,
  "conversationId" uuid NOT NULL REFERENCES public."chatConversation"(id) ON DELETE CASCADE,
  "sessionType" text NOT NULL CHECK ("sessionType" IN ('text', 'voice')),
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  reasons text[] NOT NULL DEFAULT '{}' CHECK (cardinality(reasons) <= 5),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "aiMessageFeedback_user_message_key" UNIQUE ("userId", "messageId")
);

CREATE INDEX IF NOT EXISTS "aiMessageFeedback_conversation_idx"
  ON public."aiMessageFeedback" ("conversationId");
CREATE INDEX IF NOT EXISTS "aiMessageFeedback_created_idx"
  ON public."aiMessageFeedback" ("createdAt");

ALTER TABLE public."aiMessageFeedback" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."aiMessageFeedback" FROM anon, authenticated;
GRANT SELECT ON public."aiMessageFeedback" TO authenticated;
GRANT ALL ON public."aiMessageFeedback" TO service_role;

DROP POLICY IF EXISTS "Owner selects aiMessageFeedback" ON public."aiMessageFeedback";
CREATE POLICY "Owner selects aiMessageFeedback" ON public."aiMessageFeedback"
  FOR SELECT TO authenticated
  USING (auth.uid() = "userId");

/**
 * Set (rating = 1 | -1) or clear (rating = 0) the caller's feedback on one assistant message
 * in a conversation they own. Reasons must come from the closed list in
 * supabase/functions/_shared/aiInsights/taxonomy.ts and match the rating's polarity.
 */
CREATE OR REPLACE FUNCTION public.set_ai_message_feedback(
  p_message_id uuid,
  p_rating integer,
  p_reasons text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_conversation uuid;
  v_session_type text;
  v_reasons text[];
  v_allowed text[];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_message_id IS NULL OR p_rating IS NULL OR p_rating NOT IN (-1, 0, 1) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'error', 'Invalid feedback.');
  END IF;

  SELECT m."conversationId",
         CASE WHEN c."sessionType" = 'voice' THEN 'voice' ELSE 'text' END
  INTO v_conversation, v_session_type
  FROM public."chatMessage" m
  JOIN public."chatConversation" c ON c.id = m."conversationId"
  WHERE m.id = p_message_id
    AND c."userId" = v_user
    AND coalesce(m.sender, CASE WHEN m."isFromUser" THEN 'user' ELSE 'assistant' END) = 'assistant';

  IF v_conversation IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'message_not_found', 'error', 'Message not found.');
  END IF;

  IF p_rating = 0 THEN
    DELETE FROM public."aiMessageFeedback"
    WHERE "userId" = v_user AND "messageId" = p_message_id;
    RETURN jsonb_build_object('ok', true, 'rating', 0, 'reasons', '[]'::jsonb);
  END IF;

  v_allowed := CASE
    WHEN p_rating = 1 THEN ARRAY['helpful_advice', 'felt_understood', 'clear_next_step']
    ELSE ARRAY['too_generic', 'not_relevant', 'misunderstood_me', 'too_long', 'other']
  END;

  SELECT coalesce(array_agg(DISTINCT r ORDER BY r), '{}')
  INTO v_reasons
  FROM unnest(coalesce(p_reasons, '{}')) AS r
  WHERE r = ANY (v_allowed);

  INSERT INTO public."aiMessageFeedback" (
    "userId", "messageId", "conversationId", "sessionType", rating, reasons
  )
  VALUES (v_user, p_message_id, v_conversation, v_session_type, p_rating::smallint, v_reasons)
  ON CONFLICT ("userId", "messageId") DO UPDATE
  SET rating = EXCLUDED.rating,
      reasons = EXCLUDED.reasons,
      "updatedAt" = now();

  RETURN jsonb_build_object('ok', true, 'rating', p_rating, 'reasons', to_jsonb(v_reasons));
END;
$$;

REVOKE ALL ON FUNCTION public.set_ai_message_feedback(uuid, integer, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ai_message_feedback(uuid, integer, text[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Usage ledger: classifier calls are recorded with mode 'other' (platform cost, never counted
-- against the user's text/voice monthly limit) and the new source 'insights_classify'.
-- ---------------------------------------------------------------------------

ALTER TABLE public."aiUsageEvent" DROP CONSTRAINT IF EXISTS "aiUsageEvent_source_check";
ALTER TABLE public."aiUsageEvent" ADD CONSTRAINT "aiUsageEvent_source_check" CHECK (
  source IN (
    'chat_turn', 'title', 'session_close', 'session_close_ack', 'session_finalize',
    'memory_extract', 'arc_summary', 'stt', 'tts', 'standalone_insight',
    'journal_reflection', 'coaching_summary', 'trajectory_statement', 'path_closing',
    'kota_read', 'pup_pdf', 'prompt_test', 'insights_classify'
  )
);
