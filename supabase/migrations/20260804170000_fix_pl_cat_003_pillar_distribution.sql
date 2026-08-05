-- PL-CAT-003: align catalog pillar distribution with Canonical Path Library.
-- 1) Recovery Roadmap: health → emotional (Canonical #3 Emotional Wellbeing)
-- 2) Seed Clarity & Priority Reset (Canonical #22 / stub path-55): Pro · Professional
--    No authored batch content yet (TO WRITE) — metadata only for catalog completeness.

UPDATE public.path
SET
  pillar = 'emotional',
  description = 'Pillar: Emotional Wellbeing  ·  Sub-mode: Recovery and Sobriety  ·  6 Sessions  ·  All classifications  ·  Requires recovery_mode_active = yes'
WHERE id = '0fbcafdc-5c57-589b-afc1-50955c324ca9'
  AND name = 'Recovery Roadmap';

INSERT INTO public.path (
  id,
  name,
  description,
  tier,
  pillar,
  "subMode",
  "sessionsCount",
  classifications,
  "triggerSignals"
) VALUES (
  '5a501cd8-ce2d-5955-9f8d-60582f7186a2',
  'Clarity & Priority Reset',
  'Professional  ·  Goal excavation and priority architecture  ·  Content TO WRITE',
  'pro',
  'professional',
  'general_professional',
  0,
  'Performance Stagnation · Building Momentum',
  'flag:None — catalog stub; Phase 2 content TO WRITE'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  pillar = EXCLUDED.pillar,
  "subMode" = EXCLUDED."subMode",
  "sessionsCount" = EXCLUDED."sessionsCount",
  classifications = EXCLUDED.classifications,
  "triggerSignals" = EXCLUDED."triggerSignals";
