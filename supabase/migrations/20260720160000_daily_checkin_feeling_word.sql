-- US-400 / Layer 10 — dedicated feeling word (separate from brief reflection text).
ALTER TABLE public."dailyCheckin"
  ADD COLUMN IF NOT EXISTS "feelingWord" TEXT NULL;
