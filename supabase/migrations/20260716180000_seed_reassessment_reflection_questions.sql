-- Section 2: path-adaptive reassessment reflection questions on final session of each path.
-- Updates the highest-index pathSession per path when that session has no question yet
-- (or always overwrites known MVP paths with Dr. Sam–style copy).

-- Burnout Recovery (Section 2 example copy)
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed the Burnout Recovery path in these 90 days. What does recovery actually look like for you now compared to when you started?'
WHERE ps.id = '17aa4766-f8b6-5aae-9720-5673f4f8ebc8';

-- Getting Through Hard Seasons — final session
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed Getting Through Hard Seasons. Looking back, what feels more solid now that was shaky when you started?'
WHERE ps."pathId" = 'fd060ad2-064d-5c57-82bb-92d0dcba3dd2'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s
    WHERE s."pathId" = 'fd060ad2-064d-5c57-82bb-92d0dcba3dd2'
  );

-- Recovery Roadmap — final session
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed the Recovery Roadmap path. What does staying in recovery look like for you now compared to day one?'
WHERE ps."pathId" = '0fbcafdc-5c57-589b-afc1-50955c324ca9'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s
    WHERE s."pathId" = '0fbcafdc-5c57-589b-afc1-50955c324ca9'
  );

-- Nervous System Basics
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed Nervous System Basics. How do you notice and respond to activation differently than when you started?'
WHERE ps."pathId" = 'a80a9cba-2938-57e8-9530-54c41c19551e'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s
    WHERE s."pathId" = 'a80a9cba-2938-57e8-9530-54c41c19551e'
  );

-- Navigating Grief and Loss
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed Navigating Grief and Loss. What has shifted in how you hold grief now compared to when you began?'
WHERE ps."pathId" = '48e7852c-3431-58a2-89d1-71d73e36823e'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s
    WHERE s."pathId" = '48e7852c-3431-58a2-89d1-71d73e36823e'
  );

-- Boundary Setting Foundations
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed Boundary Setting Foundations. Where are your boundaries holding differently than 90 days ago?'
WHERE ps."pathId" = 'c4585c02-be25-5679-a72f-5de048ba9974'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s
    WHERE s."pathId" = 'c4585c02-be25-5679-a72f-5de048ba9974'
  );

-- Clarity and Direction
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed Clarity and Direction. What feels clearer about where you are headed now?'
WHERE ps."pathId" = '7d90ca8d-4d1a-5e37-a287-3f9ff65b8b11'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s
    WHERE s."pathId" = '7d90ca8d-4d1a-5e37-a287-3f9ff65b8b11'
  );

-- Building Professional Momentum
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed Building Professional Momentum. What forward motion is real for you now that was stuck before?'
WHERE ps."pathId" = '14d5a7db-6c76-5fda-9d37-a4817e91c622'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s
    WHERE s."pathId" = '14d5a7db-6c76-5fda-9d37-a4817e91c622'
  );

-- Foundations of a Balanced Life
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed Foundations of a Balanced Life. Where does balance show up in your week that did not before?'
WHERE ps."pathId" = 'd23ea3a4-4a6c-5b34-87b7-c07304b018ad'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s
    WHERE s."pathId" = 'd23ea3a4-4a6c-5b34-87b7-c07304b018ad'
  );

-- Building Daily Structure
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed Building Daily Structure. Which piece of structure actually held — and what did that change?'
WHERE ps."pathId" = 'a144fb82-a164-58a1-b777-d756b88785ec'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s
    WHERE s."pathId" = 'a144fb82-a164-58a1-b777-d756b88785ec'
  );

-- Catch-all: any other path with a final session still null gets a generic variant
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" =
  'You completed this path in these 90 days. What is different now compared to when you started?'
WHERE ps."reassessmentReflectionQuestion" IS NULL
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = ps."pathId"
  )
  AND EXISTS (
    SELECT 1 FROM public.path p WHERE p.id = ps."pathId"
  );
