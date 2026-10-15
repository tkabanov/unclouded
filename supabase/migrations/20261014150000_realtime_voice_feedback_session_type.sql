-- NCLDD-57 S6 (T-031): 👍 / 👎 on realtime Conversation replies is stored as 'voice'.
-- set_ai_message_feedback (20261013130000_ai_message_feedback.sql) mapped every sessionType
-- other than 'voice' to 'text', so 'voice_conversation' feedback was recorded as text.
-- Same signature, body and grants; only the sessionType CASE changes. aiMessageFeedback's
-- CHECK stays ('text', 'voice') on purpose (see 20261014130000_realtime_voice_conversation.sql).
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.

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
         CASE WHEN c."sessionType" IN ('voice', 'voice_conversation') THEN 'voice' ELSE 'text' END
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
