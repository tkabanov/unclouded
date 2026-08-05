-- PL-REA-001: overwrite final-session reassessmentReflectionQuestion
-- with Canonical Path Library Q4.
-- Authority: docs/new_paths_content/Uncloud360_Canonical_Path_Library.md
-- § Path-Specific Reassessment Questions
-- Fixes stale July seed copy (paths 1–3+) and NULL after Aug 4 reseed
-- (e.g. #14 Foundations of a Balanced Life, #18 Leading Under Pressure).

BEGIN;

-- #1 Getting Through Hard Seasons
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Getting Through Hard Seasons path. Where are you now compared to when you started - not the ideal version, the real one?'
WHERE ps."pathId" = 'fd060ad2-064d-5c57-82bb-92d0dcba3dd2'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'fd060ad2-064d-5c57-82bb-92d0dcba3dd2'
  );

-- #2 Burnout Recovery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Burnout Recovery path. What does your relationship with burnout actually look like now - and what warning signs can you see that you couldn''t before?'
WHERE ps."pathId" = '23c1f8da-4f08-51c0-bcc0-e4ed845a5b7e'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '23c1f8da-4f08-51c0-bcc0-e4ed845a5b7e'
  );

-- #3 Recovery Roadmap
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Recovery Roadmap path. What feels most solid in your recovery right now, and what still feels fragile?'
WHERE ps."pathId" = '0fbcafdc-5c57-589b-afc1-50955c324ca9'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '0fbcafdc-5c57-589b-afc1-50955c324ca9'
  );

-- #4 Nervous System Basics
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Nervous System Basics path. What has actually shifted in how you recognize and respond to what your nervous system is telling you?'
WHERE ps."pathId" = 'a80a9cba-2938-57e8-9530-54c41c19551e'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'a80a9cba-2938-57e8-9530-54c41c19551e'
  );

-- #5 Navigating Grief and Loss
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Navigating Grief and Loss path. Where are you in your grief right now - not where you think you should be, where you actually are?'
WHERE ps."pathId" = '48e7852c-3431-58a2-89d1-71d73e36823e'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '48e7852c-3431-58a2-89d1-71d73e36823e'
  );

-- #6 Boundary Setting Foundations
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Boundary Setting Foundations path. Where have you actually applied what you learned, and where are you still finding it hard to hold the line?'
WHERE ps."pathId" = 'c4585c02-be25-5679-a72f-5de048ba9974'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'c4585c02-be25-5679-a72f-5de048ba9974'
  );

-- #7 Clarity and Direction
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Clarity and Direction path. What is clearer now, and what is still foggy or unresolved?'
WHERE ps."pathId" = '7d90ca8d-4d1a-5e37-a287-3f9ff65b8b11'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '7d90ca8d-4d1a-5e37-a287-3f9ff65b8b11'
  );

-- #8 Building Professional Momentum
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Building Professional Momentum path. What is the most meaningful progress you''ve made, and what is the one thing most likely to knock you off course?'
WHERE ps."pathId" = '14d5a7db-6c76-5fda-9d37-a4817e91c622'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '14d5a7db-6c76-5fda-9d37-a4817e91c622'
  );

-- #9 Understanding Your Emotional Patterns
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Understanding Your Emotional Patterns path. What pattern do you understand about yourself now that you couldn''t have named 90 days ago?'
WHERE ps."pathId" = 'f1b841e9-a4bf-51d9-b598-0514d6668d0d'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'f1b841e9-a4bf-51d9-b598-0514d6668d0d'
  );

-- #10 Living Through Disruption
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Living Through Disruption path. Where are you in this disruption now - more grounded, more lost, or somewhere in between?'
WHERE ps."pathId" = '5fa6c614-0790-5690-a22f-3befea9ec6eb'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '5fa6c614-0790-5690-a22f-3befea9ec6eb'
  );

-- #11 Focus and Follow-Through
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Focus and Follow-Through path. What has actually changed in how you follow through, and where are you still getting stuck?'
WHERE ps."pathId" = '996337fe-0a1b-5d13-9052-87fd77415197'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '996337fe-0a1b-5d13-9052-87fd77415197'
  );

-- #12 Sustainable High Performance
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Sustainable High Performance path. Where are you performing more sustainably than 90 days ago, and where are you still running on borrowed time?'
WHERE ps."pathId" = '60b456bb-3e86-5dd0-9a3a-6dbac3fc6fe7'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '60b456bb-3e86-5dd0-9a3a-6dbac3fc6fe7'
  );

-- #13 Breaking Out of the Comfortable Plateau
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Breaking Out of the Comfortable Plateau path. What did you actually break, and what are you still protecting out of habit or comfort?'
WHERE ps."pathId" = '3cdedde4-bfe4-5f0a-af73-af5d5b06fb97'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '3cdedde4-bfe4-5f0a-af73-af5d5b06fb97'
  );

-- #14 Foundations of a Balanced Life
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Foundations of a Balanced Life path. What does balance actually look like in your real life right now - not the aspiration, the reality?'
WHERE ps."pathId" = 'd23ea3a4-4a6c-5b34-87b7-c07304b018ad'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'd23ea3a4-4a6c-5b34-87b7-c07304b018ad'
  );

-- #15 Building Daily Structure
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Building Daily Structure path. Which structures took root, which didn''t, and what does that tell you about what works for you specifically?'
WHERE ps."pathId" = 'a144fb82-a164-58a1-b777-d756b88785ec'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'a144fb82-a164-58a1-b777-d756b88785ec'
  );

-- #16 30-Day Foundation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the 30-Day Foundation path. What foundation did you actually build, and what is still shaky?'
WHERE ps."pathId" = '1a8cb2d4-5678-50aa-988b-111437a5baca'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '1a8cb2d4-5678-50aa-988b-111437a5baca'
  );

-- #17 Build Better Health Habits
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Build Better Health Habits path. What one health habit has genuinely changed, and what are you still fighting?'
WHERE ps."pathId" = '895a0ed5-104a-506f-956b-1ff480b69b61'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '895a0ed5-104a-506f-956b-1ff480b69b61'
  );

-- #18 Leading Under Pressure
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Leading Under Pressure path. What has shifted in how you lead when things are hard - and what do you still need to work on?'
WHERE ps."pathId" = 'c0a00b6c-1733-50f5-9960-72988e039666'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'c0a00b6c-1733-50f5-9960-72988e039666'
  );

-- #19 Stress Regulation Foundations
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Stress Regulation Foundations path. What does your relationship with stress actually look like now compared to when you started?'
WHERE ps."pathId" = '092ee8b6-7794-53bc-854e-e74ae85845a0'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '092ee8b6-7794-53bc-854e-e74ae85845a0'
  );

-- #20 Emotional Recovery Toolkit
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Emotional Recovery Toolkit path. When something hard hits now, what is different - even slightly - about how you move through it?'
WHERE ps."pathId" = '7d1f4300-168e-533c-b51e-ee0271907900'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '7d1f4300-168e-533c-b51e-ee0271907900'
  );

-- #21 Burnout Awareness
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Burnout Awareness path. What warning signs do you recognize in yourself now that you might have missed before?'
WHERE ps."pathId" = '61d0c548-f347-5eac-b2b2-98d309dee8bb'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '61d0c548-f347-5eac-b2b2-98d309dee8bb'
  );

-- #22 Clarity & Priority Reset
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Clarity & Priority Reset path. What is clearer now about what actually matters, and what noise have you been able to put down?'
WHERE ps."pathId" = '9b4c801b-a633-50d9-a3b3-c5adbaf4a578'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '9b4c801b-a633-50d9-a3b3-c5adbaf4a578'
  );

-- #23 Follow-Through Systems
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Follow-Through Systems path. What systems are actually working, and which ones have you quietly abandoned?'
WHERE ps."pathId" = '9ebfce82-2cd4-58f3-a326-98f177917b94'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '9ebfce82-2cd4-58f3-a326-98f177917b94'
  );

-- #24 Habit Foundation Builder
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Habit Foundation Builder path. Which habits took root and which ones didn''t - and what does that tell you?'
WHERE ps."pathId" = '5f69c6e0-3353-5375-8a7f-d8bb3acb61a5'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '5f69c6e0-3353-5375-8a7f-d8bb3acb61a5'
  );

-- #25 Sleep & Recovery Basics
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Sleep & Recovery Basics path. What has actually shifted in how you rest and restore - and what is still getting in the way?'
WHERE ps."pathId" = 'f9d8ee7d-3cc1-5c91-a0d6-1256c84b5a39'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'f9d8ee7d-3cc1-5c91-a0d6-1256c84b5a39'
  );

-- #26 Nervous System Regulation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Nervous System Regulation path. What does regulated feel like in your body now, and how often do you actually get there?'
WHERE ps."pathId" = '80f160b1-925f-5aa3-84b6-6c3b8f2f23ff'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '80f160b1-925f-5aa3-84b6-6c3b8f2f23ff'
  );

-- #27 Inner Critic to Inner Coach
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Inner Critic to Inner Coach path. Where do you notice the inner critic showing up less - and where is it still loud?'
WHERE ps."pathId" = '0a0057c7-6a86-5047-ac1f-476b453f0718'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '0a0057c7-6a86-5047-ac1f-476b453f0718'
  );

-- #28 Relationship Reset
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Relationship Reset path. Which relationships feel different now, and which ones still need work?'
WHERE ps."pathId" = 'd8c1c568-b01e-5c5d-a78c-eec24527e488'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'd8c1c568-b01e-5c5d-a78c-eec24527e488'
  );

-- #29 Social Connection Architecture
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Social Connection Architecture path. What has changed about how you build and protect connection in your actual life?'
WHERE ps."pathId" = 'c8b0ef77-dae2-55bf-8fc2-166e6757219b'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'c8b0ef77-dae2-55bf-8fc2-166e6757219b'
  );

-- #30 Leadership Under Pressure
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Leadership Under Pressure path. What has shifted in how you lead when things are hard, and where are you still finding it most difficult?'
WHERE ps."pathId" = '9f3c6c27-7418-59cf-a5e8-7a7e059ffb78'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '9f3c6c27-7418-59cf-a5e8-7a7e059ffb78'
  );

-- #31 Career Transition Navigator
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Career Transition Navigator path. Where are you in this transition now - more grounded, more lost, or somewhere in between?'
WHERE ps."pathId" = '5a4449ef-2178-5b0a-91b2-b0e56165441c'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '5a4449ef-2178-5b0a-91b2-b0e56165441c'
  );

-- #32 Confidence Architecture
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Confidence Architecture path. Where do you notice more confidence showing up in your actual life, and where does the old self-doubt still surface?'
WHERE ps."pathId" = 'b46711fb-548a-56d9-8aee-abaa786fb1f1'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'b46711fb-548a-56d9-8aee-abaa786fb1f1'
  );

-- #33 From Busy to Effective
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the From Busy to Effective path. What has genuinely changed about where you spend your time and attention, and what is still defaulting to busy?'
WHERE ps."pathId" = '067e2422-a112-5b35-8516-e590c310aa9f'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '067e2422-a112-5b35-8516-e590c310aa9f'
  );

-- #34 Strategic Focus System
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Strategic Focus System path. What are you focused on with more intention now, and what distractions are you still fighting?'
WHERE ps."pathId" = '12a003fe-efb6-5d44-97d0-3c3e171fcc1e'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '12a003fe-efb6-5d44-97d0-3c3e171fcc1e'
  );

-- #35 Energy Management System
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Energy Management System path. What has genuinely changed about how you protect and spend your energy, and what is still leaking?'
WHERE ps."pathId" = 'edcc2e2a-2d4d-5cfd-805f-1d7c7be3c80d'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'edcc2e2a-2d4d-5cfd-805f-1d7c7be3c80d'
  );

-- #36 Body Reconnection
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Body Reconnection path. What has shifted in your relationship with your physical body - be honest about where you are, not where you want to be?'
WHERE ps."pathId" = 'f34e0dcf-d5ae-599b-af10-e90f122987ef'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'f34e0dcf-d5ae-599b-af10-e90f122987ef'
  );

-- #37 Financial Stress Navigation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Financial Stress Navigation path. What has shifted in how financial stress sits in your life, even if the numbers haven''t changed?'
WHERE ps."pathId" = 'd2a1acdf-af23-5e37-a007-27480e2c0e66'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'd2a1acdf-af23-5e37-a007-27480e2c0e66'
  );

-- #38 Values Excavation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Values Excavation path. Which values feel most alive and non-negotiable in your life right now?'
WHERE ps."pathId" = 'aae90d4b-0393-5a32-ae84-9009ad905a61'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'aae90d4b-0393-5a32-ae84-9009ad905a61'
  );

-- #39 Purpose Discovery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Purpose Discovery path. What feels more clear about what actually matters to you - and what is still unresolved?'
WHERE ps."pathId" = 'c4855974-758d-5fca-9552-491dfc66712c'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'c4855974-758d-5fca-9552-491dfc66712c'
  );

-- #40 Life Direction Reset
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Life Direction Reset path. What direction feels truest to you right now - even if it''s still uncertain?'
WHERE ps."pathId" = 'f268f838-3726-5972-96cb-4a5891de7641'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'f268f838-3726-5972-96cb-4a5891de7641'
  );

-- #41 Identity After Role Loss
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Identity After Role Loss path. Who are you becoming on the other side of this - and what parts of the old identity are you still holding onto?'
WHERE ps."pathId" = '4e12f571-914d-5af0-8a26-a4637449792a'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '4e12f571-914d-5af0-8a26-a4637449792a'
  );

-- #42 High Performance Sustainability
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the High Performance Sustainability path. Where are you operating closer to your ceiling sustainably, and where are you still leaving the most on the table?'
WHERE ps."pathId" = '289b462e-b51f-579f-80a0-881933161dca'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '289b462e-b51f-579f-80a0-881933161dca'
  );

-- #43 The Optimization Protocol
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Optimization Protocol path. Where are you operating at your best, and what is the one area where you''re still leaving the most performance behind?'
WHERE ps."pathId" = '7b3427de-19d9-586c-9411-90f6295496e2'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '7b3427de-19d9-586c-9411-90f6295496e2'
  );

-- #44 Deep Identity Work
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Deep Identity Work path. What do you understand about yourself now that you couldn''t have articulated 90 days ago?'
WHERE ps."pathId" = 'e4f089bf-436d-5eca-ad5d-601d31e8df6f'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'e4f089bf-436d-5eca-ad5d-601d31e8df6f'
  );

-- #45 Boundary Mastery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Boundary Mastery path. Where are your boundaries holding, and where are you still letting them collapse under pressure?'
WHERE ps."pathId" = '1f0d836e-173e-5d38-9c20-fd1b30d3239e'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '1f0d836e-173e-5d38-9c20-fd1b30d3239e'
  );

-- #46 Grief Integration
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Grief Integration path. Where does your grief live in your life now - not processed and gone, just where it actually sits today?'
WHERE ps."pathId" = '3a62a726-cb61-5c7a-a7b3-3d5743994a35'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '3a62a726-cb61-5c7a-a7b3-3d5743994a35'
  );

-- #47 Recovery Deepening
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Recovery Deepening path. What does your recovery look and feel like now at this stage, and what is the next real edge for you?'
WHERE ps."pathId" = '9705862d-2ec8-5f67-90c9-4d552b38092d'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '9705862d-2ec8-5f67-90c9-4d552b38092d'
  );

-- #48 Decision Intelligence
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Decision Intelligence path. What is different about how you make decisions under pressure - and where do you still freeze or avoid?'
WHERE ps."pathId" = '93f520cf-806d-55ce-be99-c56879d804df'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '93f520cf-806d-55ce-be99-c56879d804df'
  );

-- #49 Work-Life Integration
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Work-Life Integration path. What does the integration actually look like in your real life right now - not the ideal version?'
WHERE ps."pathId" = 'f67a6ea3-21e3-57d9-9e7b-30fd722b22b3'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'f67a6ea3-21e3-57d9-9e7b-30fd722b22b3'
  );

-- #50 Sobriety and Identity
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Sobriety and Identity path. Who are you becoming in your sobriety - and which parts of that new identity feel most true?'
WHERE ps."pathId" = '6dfd8074-0637-5850-a246-322ead788fb8'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '6dfd8074-0637-5850-a246-322ead788fb8'
  );

-- #51 Chronic Stress Recovery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Chronic Stress Recovery path. What has your nervous system and body experienced over these 90 days - more rest, more strain, or something more complicated?'
WHERE ps."pathId" = 'fc2cbfd0-1bee-5a9f-85ec-c8ae2863b4f3'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'fc2cbfd0-1bee-5a9f-85ec-c8ae2863b4f3'
  );

-- #52 Sleep Mastery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Sleep Mastery path. What is your sleep actually like now - not the goal, the reality?'
WHERE ps."pathId" = '33de037a-4b9b-5809-884c-87ec0e426f13'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '33de037a-4b9b-5809-884c-87ec0e426f13'
  );

-- #53 Financial Foundation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Financial Foundation path. What feels more solid now in your financial picture, and where is the ground still shaky?'
WHERE ps."pathId" = '1af5c1c7-7e02-5ad5-afd2-536e94ec9151'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '1af5c1c7-7e02-5ad5-afd2-536e94ec9151'
  );

-- #54 Career Clarity
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Career Clarity path. What is clearer about where you want to go professionally - and what is still uncertain?'
WHERE ps."pathId" = 'fd7d061f-7bdd-5474-a3f2-70fc4fe1cb26'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = 'fd7d061f-7bdd-5474-a3f2-70fc4fe1cb26'
  );

-- #55 Transitions and Change
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Transitions and Change path. Where are you in this transition right now - and what does the next honest step look like?'
WHERE ps."pathId" = '5a501cd8-ce2d-5955-9f8d-60582f7186a2'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = '5a501cd8-ce2d-5955-9f8d-60582f7186a2'
  );

COMMIT;
