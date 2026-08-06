-- PL-REA-003: rewrite final-session reassessmentReflectionQuestion by path.name.
--
-- Bug in 20260805120000_seed_canonical_reassessment_q4.sql (+ partial fix
-- 20260805130000): updates used uuid5(path-{Canonical#}), but runtime path ids
-- follow batch PATH N numbering (OVR-037). Result: many name-swapped Q4 texts.
--
-- Authority: docs/new_paths_content/Uncloud360_Canonical_Path_Library.md
-- § Path-Specific Reassessment Questions — matched by Canonical path name.
-- Stub «Clarity & Priority Reset» has 0 sessions; UPDATE is a no-op (expected).

BEGIN;

-- Canonical #1: Getting Through Hard Seasons
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Getting Through Hard Seasons path. Where are you now compared to when you started - not the ideal version, the real one?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Getting Through Hard Seasons'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #2: Burnout Recovery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Burnout Recovery path. What does your relationship with burnout actually look like now - and what warning signs can you see that you couldn''t before?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Burnout Recovery'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #3: Recovery Roadmap
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Recovery Roadmap path. What feels most solid in your recovery right now, and what still feels fragile?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Recovery Roadmap'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #4: Nervous System Basics
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Nervous System Basics path. What has actually shifted in how you recognize and respond to what your nervous system is telling you?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Nervous System Basics'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #5: Navigating Grief and Loss
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Navigating Grief and Loss path. Where are you in your grief right now - not where you think you should be, where you actually are?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Navigating Grief and Loss'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #6: Boundary Setting Foundations
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Boundary Setting Foundations path. Where have you actually applied what you learned, and where are you still finding it hard to hold the line?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Boundary Setting Foundations'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #7: Clarity and Direction
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Clarity and Direction path. What is clearer now, and what is still foggy or unresolved?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Clarity and Direction'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #8: Building Professional Momentum
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Building Professional Momentum path. What is the most meaningful progress you''ve made, and what is the one thing most likely to knock you off course?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Building Professional Momentum'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #9: Understanding Your Emotional Patterns
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Understanding Your Emotional Patterns path. What pattern do you understand about yourself now that you couldn''t have named 90 days ago?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Understanding Your Emotional Patterns'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #10: Living Through Disruption
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Living Through Disruption path. Where are you in this disruption now - more grounded, more lost, or somewhere in between?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Living Through Disruption'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #11: Focus and Follow-Through
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Focus and Follow-Through path. What has actually changed in how you follow through, and where are you still getting stuck?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Focus and Follow-Through'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #12: Sustainable High Performance
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Sustainable High Performance path. Where are you performing more sustainably than 90 days ago, and where are you still running on borrowed time?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Sustainable High Performance'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #13: Breaking Out of the Comfortable Plateau
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Breaking Out of the Comfortable Plateau path. What did you actually break, and what are you still protecting out of habit or comfort?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Breaking Out of the Comfortable Plateau'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #14: Foundations of a Balanced Life
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Foundations of a Balanced Life path. What does balance actually look like in your real life right now - not the aspiration, the reality?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Foundations of a Balanced Life'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #15: Building Daily Structure
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Building Daily Structure path. Which structures took root, which didn''t, and what does that tell you about what works for you specifically?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Building Daily Structure'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #16: 30-Day Foundation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the 30-Day Foundation path. What foundation did you actually build, and what is still shaky?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = '30-Day Foundation'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #17: Build Better Health Habits
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Build Better Health Habits path. What one health habit has genuinely changed, and what are you still fighting?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Build Better Health Habits'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #18: Leading Under Pressure
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Leading Under Pressure path. What has shifted in how you lead when things are hard - and what do you still need to work on?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Leading Under Pressure'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #19: Stress Regulation Foundations
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Stress Regulation Foundations path. What does your relationship with stress actually look like now compared to when you started?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Stress Regulation Foundations'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #20: Emotional Recovery Toolkit
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Emotional Recovery Toolkit path. When something hard hits now, what is different - even slightly - about how you move through it?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Emotional Recovery Toolkit'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #21: Burnout Awareness
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Burnout Awareness path. What warning signs do you recognize in yourself now that you might have missed before?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Burnout Awareness'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #22: Clarity & Priority Reset
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Clarity & Priority Reset path. What is clearer now about what actually matters, and what noise have you been able to put down?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Clarity & Priority Reset'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #23: Follow-Through Systems
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Follow-Through Systems path. What systems are actually working, and which ones have you quietly abandoned?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Follow-Through Systems'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #24: Habit Foundation Builder
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Habit Foundation Builder path. Which habits took root and which ones didn''t - and what does that tell you?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Habit Foundation Builder'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #25: Sleep & Recovery Basics
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Sleep & Recovery Basics path. What has actually shifted in how you rest and restore - and what is still getting in the way?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Sleep & Recovery Basics'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #26: Nervous System Regulation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Nervous System Regulation path. What does regulated feel like in your body now, and how often do you actually get there?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Nervous System Regulation'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #27: Inner Critic to Inner Coach
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Inner Critic to Inner Coach path. Where do you notice the inner critic showing up less - and where is it still loud?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Inner Critic to Inner Coach'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #28: Relationship Reset
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Relationship Reset path. Which relationships feel different now, and which ones still need work?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Relationship Reset'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #29: Social Connection Architecture
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Social Connection Architecture path. What has changed about how you build and protect connection in your actual life?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Social Connection Architecture'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #30: Leadership Under Pressure
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Leadership Under Pressure path. What has shifted in how you lead when things are hard, and where are you still finding it most difficult?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Leadership Under Pressure'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #31: Career Transition Navigator
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Career Transition Navigator path. Where are you in this transition now - more grounded, more lost, or somewhere in between?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Career Transition Navigator'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #32: Confidence Architecture
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Confidence Architecture path. Where do you notice more confidence showing up in your actual life, and where does the old self-doubt still surface?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Confidence Architecture'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #33: From Busy to Effective
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the From Busy to Effective path. What has genuinely changed about where you spend your time and attention, and what is still defaulting to busy?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'From Busy to Effective'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #34: Strategic Focus System
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Strategic Focus System path. What are you focused on with more intention now, and what distractions are you still fighting?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Strategic Focus System'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #35: Energy Management System
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Energy Management System path. What has genuinely changed about how you protect and spend your energy, and what is still leaking?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Energy Management System'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #36: Body Reconnection
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Body Reconnection path. What has shifted in your relationship with your physical body - be honest about where you are, not where you want to be?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Body Reconnection'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #37: Financial Stress Navigation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Financial Stress Navigation path. What has shifted in how financial stress sits in your life, even if the numbers haven''t changed?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Financial Stress Navigation'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #38: Values Excavation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Values Excavation path. Which values feel most alive and non-negotiable in your life right now?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Values Excavation'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #39: Purpose Discovery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Purpose Discovery path. What feels more clear about what actually matters to you - and what is still unresolved?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Purpose Discovery'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #40: Life Direction Reset
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Life Direction Reset path. What direction feels truest to you right now - even if it''s still uncertain?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Life Direction Reset'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #41: Identity After Role Loss
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Identity After Role Loss path. Who are you becoming on the other side of this - and what parts of the old identity are you still holding onto?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Identity After Role Loss'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #42: High Performance Sustainability
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the High Performance Sustainability path. Where are you operating closer to your ceiling sustainably, and where are you still leaving the most on the table?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'High Performance Sustainability'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #43: The Optimization Protocol
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Optimization Protocol path. Where are you operating at your best, and what is the one area where you''re still leaving the most performance behind?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'The Optimization Protocol'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #44: Deep Identity Work
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Deep Identity Work path. What do you understand about yourself now that you couldn''t have articulated 90 days ago?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Deep Identity Work'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #45: Boundary Mastery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Boundary Mastery path. Where are your boundaries holding, and where are you still letting them collapse under pressure?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Boundary Mastery'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #46: Grief Integration
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Grief Integration path. Where does your grief live in your life now - not processed and gone, just where it actually sits today?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Grief Integration'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #47: Recovery Deepening
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Recovery Deepening path. What does your recovery look and feel like now at this stage, and what is the next real edge for you?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Recovery Deepening'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #48: Decision Intelligence
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Decision Intelligence path. What is different about how you make decisions under pressure - and where do you still freeze or avoid?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Decision Intelligence'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #49: Work-Life Integration
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Work-Life Integration path. What does the integration actually look like in your real life right now - not the ideal version?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Work-Life Integration'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #50: Sobriety and Identity
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Sobriety and Identity path. Who are you becoming in your sobriety - and which parts of that new identity feel most true?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Sobriety and Identity'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #51: Chronic Stress Recovery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Chronic Stress Recovery path. What has your nervous system and body experienced over these 90 days - more rest, more strain, or something more complicated?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Chronic Stress Recovery'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #52: Sleep Mastery
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Sleep Mastery path. What is your sleep actually like now - not the goal, the reality?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Sleep Mastery'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #53: Financial Foundation
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Financial Foundation path. What feels more solid now in your financial picture, and where is the ground still shaky?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Financial Foundation'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #54: Career Clarity
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Career Clarity path. What is clearer about where you want to go professionally - and what is still uncertain?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Career Clarity'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

-- Canonical #55: Transitions and Change
UPDATE public."pathSession" ps
SET "reassessmentReflectionQuestion" = 'You completed the Transitions and Change path. Where are you in this transition right now - and what does the next honest step look like?'
FROM public.path p
WHERE p.id = ps."pathId"
  AND p.name = 'Transitions and Change'
  AND COALESCE(p."subMode", '') <> 'success_plan'
  AND ps.index = (
    SELECT MAX(s.index) FROM public."pathSession" s WHERE s."pathId" = p.id
  );

COMMIT;
