-- PL-REA-002: correct pathId mapping for Canonical Q4 paths #51–#55.
--
-- Bug in 20260805120000_seed_canonical_reassessment_q4.sql:
--   #51 Chronic Stress Recovery → Sleep Mastery id (fc2cbfd0-…)
--   #52 Sleep Mastery → High Performance Sustainability id (33de037a-…)
--   #53 Financial Foundation → The Optimization Protocol id (1af5c1c7-…)
--   #54 Career Clarity → Deep Identity Work id (fd7d061f-…)
--   #55 Transitions and Change → Clarity & Priority Reset stub (5a501cd8-…)
--
-- Also restore #42–#44 on their real ids (polluted by the wrong #52–#54 targets).
-- Authority: docs/new_paths_content/Uncloud360_Canonical_Path_Library.md
-- IDs: supabase/migrations/20260804160000_seed_paths_library_from_new_docs.sql

BEGIN;

-- #42 High Performance Sustainability (restore after wrong #52 write)
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the High Performance Sustainability path. Where are you operating closer to your ceiling sustainably, and where are you still leaving the most on the table?'
WHERE ps."pathId" = '33de037a-4b9b-5809-884c-87ec0e426f13'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '33de037a-4b9b-5809-884c-87ec0e426f13'
  );

-- #43 The Optimization Protocol (restore after wrong #53 write)
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Optimization Protocol path. Where are you operating at your best, and what is the one area where you''re still leaving the most performance behind?'
WHERE ps."pathId" = '1af5c1c7-7e02-5ad5-afd2-536e94ec9151'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '1af5c1c7-7e02-5ad5-afd2-536e94ec9151'
  );

-- #44 Deep Identity Work (restore after wrong #54 write)
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Deep Identity Work path. What do you understand about yourself now that you couldn''t have articulated 90 days ago?'
WHERE ps."pathId" = 'fd7d061f-7bdd-5474-a3f2-70fc4fe1cb26'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'fd7d061f-7bdd-5474-a3f2-70fc4fe1cb26'
  );

-- #51 Chronic Stress Recovery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Chronic Stress Recovery path. What has your nervous system and body experienced over these 90 days - more rest, more strain, or something more complicated?'
WHERE ps."pathId" = '1f0d836e-173e-5d38-9c20-fd1b30d3239e'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '1f0d836e-173e-5d38-9c20-fd1b30d3239e'
  );

-- #52 Sleep Mastery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Sleep Mastery path. What is your sleep actually like now - not the goal, the reality?'
WHERE ps."pathId" = 'fc2cbfd0-1bee-5a9f-85ec-c8ae2863b4f3'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'fc2cbfd0-1bee-5a9f-85ec-c8ae2863b4f3'
  );

-- #53 Financial Foundation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Financial Foundation path. What feels more solid now in your financial picture, and where is the ground still shaky?'
WHERE ps."pathId" = 'f67a6ea3-21e3-57d9-9e7b-30fd722b22b3'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'f67a6ea3-21e3-57d9-9e7b-30fd722b22b3'
  );

-- #54 Career Clarity
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Career Clarity path. What is clearer about where you want to go professionally - and what is still uncertain?'
WHERE ps."pathId" = '9705862d-2ec8-5f67-90c9-4d552b38092d'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '9705862d-2ec8-5f67-90c9-4d552b38092d'
  );

-- #55 Transitions and Change
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Transitions and Change path. Where are you in this transition right now - and what does the next honest step look like?'
WHERE ps."pathId" = '93f520cf-806d-55ce-be99-c56879d804df'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '93f520cf-806d-55ce-be99-c56879d804df'
  );

COMMIT;
