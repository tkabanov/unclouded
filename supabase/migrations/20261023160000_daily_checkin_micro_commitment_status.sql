-- NCLDD-62: Layer 10 check-in follow-through column.
-- Client insert and chat live-context reads have selected "microCommitmentStatus" since 2026-07-20,
-- but the column was never created: reads failed with 42703 (silently treated as "table missing")
-- and inserts with a follow-through answer failed with PGRST204.

ALTER TABLE public."dailyCheckin"
  ADD COLUMN IF NOT EXISTS "microCommitmentStatus" text;

NOTIFY pgrst, 'reload schema';
