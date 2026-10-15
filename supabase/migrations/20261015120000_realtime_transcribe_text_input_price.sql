-- NCLDD-57 QA-1: gpt-4o-mini-transcribe text input price.
--
-- OpenAI reports a small number of text input tokens (the transcription prompt) on every
-- `conversation.item.input_audio_transcription.completed` usage. 20261014130000 seeded only
-- audio_token_in_1m, token_out_1m and audio_minute for this model, so computeCostUsd()
-- flagged every realtime_transcription ledger row as pricingMissing and the admin AI Usage
-- page shows "no price set".
--
-- Text input is priced at $1.25 / 1M (OpenAI text-token rate for gpt-4o-mini-transcribe).
-- Cached text input falls back to token_in_1m in computeCostUsd(), so no extra row is needed.
INSERT INTO public."aiModelPricing" (provider, model, unit, "usdPerUnit") VALUES
  ('openai', 'gpt-4o-mini-transcribe', 'token_in_1m', 1.25)
ON CONFLICT DO NOTHING;

-- Re-price ledger rows written before this price existed. Mirrors computeCostUsd(): all text
-- input (cached falls back to token_in_1m) at 1.25 / 1M, total rounded to 6 decimals. Only rows
-- whose sole missing unit was text input are touched: every other unit this model can report
-- (audio_token_in_1m, token_out_1m, audio_minute) is priced since 20261014130000.
UPDATE public."aiUsageEvent"
SET "costUsd" = round(coalesce("costUsd", 0) + coalesce("inputTokens", 0) * 1.25 / 1000000, 6),
    "pricingMissing" = false
WHERE provider = 'openai'
  AND model = 'gpt-4o-mini-transcribe'
  AND "pricingMissing" = true
  AND coalesce("inputTokens", 0) > 0
  AND coalesce("ttsChars", 0) = 0
  AND coalesce("audioOutputTokens", 0) = 0;
