-- NCLDD-52 slice 1: AI usage ledger (estimated cost per OpenAI call) + model price table.
-- Append-only ledger written by edge functions with the service role. No client policies:
-- reads go through admin SECURITY DEFINER RPCs (later migrations). Additive only.

-- ---------------------------------------------------------------------------
-- Model prices (changed by migration only)
-- ---------------------------------------------------------------------------
-- Units: token_*_1m = USD per 1,000,000 tokens; audio_minute = USD per audio minute;
-- tts_1m_chars = USD per 1,000,000 input characters.
-- VERIFY these against the current OpenAI price list before applying.

CREATE TABLE IF NOT EXISTS public."aiModelPricing" (
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL,
  unit text NOT NULL CHECK (
    unit IN ('token_in_1m', 'token_out_1m', 'token_cached_in_1m', 'audio_minute', 'tts_1m_chars')
  ),
  "usdPerUnit" numeric(14, 6) NOT NULL CHECK ("usdPerUnit" >= 0),
  "effectiveFrom" timestamptz NOT NULL DEFAULT '2024-01-01T00:00:00Z',
  PRIMARY KEY (provider, model, unit, "effectiveFrom")
);

INSERT INTO public."aiModelPricing" (provider, model, unit, "usdPerUnit") VALUES
  ('openai', 'gpt-4o-mini', 'token_in_1m', 0.15),
  ('openai', 'gpt-4o-mini', 'token_cached_in_1m', 0.075),
  ('openai', 'gpt-4o-mini', 'token_out_1m', 0.60),
  ('openai', 'whisper-1', 'audio_minute', 0.006),
  ('openai', 'tts-1', 'tts_1m_chars', 15.00)
ON CONFLICT DO NOTHING;

ALTER TABLE public."aiModelPricing" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."aiModelPricing" FROM anon, authenticated;
GRANT SELECT ON public."aiModelPricing" TO authenticated;
GRANT ALL ON public."aiModelPricing" TO service_role;

DROP POLICY IF EXISTS "Admin reads aiModelPricing" ON public."aiModelPricing";
CREATE POLICY "Admin reads aiModelPricing" ON public."aiModelPricing"
  FOR SELECT TO authenticated
  USING (public.is_settings_admin());

-- ---------------------------------------------------------------------------
-- Usage ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."aiUsageEvent" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "conversationId" uuid,
  mode text NOT NULL CHECK (mode IN ('text', 'voice', 'other')),
  source text NOT NULL CHECK (
    source IN (
      'chat_turn', 'title', 'session_close', 'session_close_ack', 'session_finalize',
      'memory_extract', 'arc_summary', 'stt', 'tts', 'standalone_insight',
      'journal_reflection', 'coaching_summary', 'trajectory_statement', 'path_closing',
      'kota_read', 'pup_pdf', 'prompt_test'
    )
  ),
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL,
  "inputTokens" integer NOT NULL DEFAULT 0 CHECK ("inputTokens" >= 0),
  "outputTokens" integer NOT NULL DEFAULT 0 CHECK ("outputTokens" >= 0),
  "cachedInputTokens" integer NOT NULL DEFAULT 0 CHECK ("cachedInputTokens" >= 0),
  "audioSeconds" numeric(12, 3) NOT NULL DEFAULT 0 CHECK ("audioSeconds" >= 0),
  "ttsChars" integer NOT NULL DEFAULT 0 CHECK ("ttsChars" >= 0),
  "costUsd" numeric(12, 6) NOT NULL DEFAULT 0 CHECK ("costUsd" >= 0),
  "costIsEstimated" boolean NOT NULL DEFAULT true,
  -- True when no price row matched the model, so costUsd is 0 for lack of data.
  "pricingMissing" boolean NOT NULL DEFAULT false,
  -- Snapshot of the effective tier (there is no subscription history to join later).
  "planTierAtEvent" text NOT NULL DEFAULT 'free' CHECK ("planTierAtEvent" IN ('free', 'pro', 'premium')),
  "monthKey" text NOT NULL DEFAULT to_char(timezone('utc', now()), 'YYYY-MM'),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "aiUsageEvent_createdAt_idx" ON public."aiUsageEvent" ("createdAt");
CREATE INDEX IF NOT EXISTS "aiUsageEvent_user_month_mode_idx"
  ON public."aiUsageEvent" ("userId", "monthKey", mode);
CREATE INDEX IF NOT EXISTS "aiUsageEvent_conversation_idx"
  ON public."aiUsageEvent" ("conversationId") WHERE "conversationId" IS NOT NULL;

ALTER TABLE public."aiUsageEvent" ENABLE ROW LEVEL SECURITY;
-- No policies and no grants for anon/authenticated: only the service role writes,
-- only admin SECURITY DEFINER RPCs read.
REVOKE ALL ON public."aiUsageEvent" FROM anon, authenticated;
GRANT ALL ON public."aiUsageEvent" TO service_role;

COMMENT ON TABLE public."aiUsageEvent" IS
  'NCLDD-52: append-only AI usage ledger. costUsd is an ESTIMATE (tokens/seconds/chars x aiModelPricing).';
