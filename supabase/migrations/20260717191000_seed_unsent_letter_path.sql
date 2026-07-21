-- REQ-15: Unsent Letter — Directed Writing path (4 sessions)
-- Available when grief_mode, recovery_mode, or transition_flag is active.

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
  'c8e1f0a2-4b3d-5e6f-9a0b-1c2d3e4f5a6b',
  'The Unsent Letter',
  'Directed Writing · Grief / Recovery / Transition — write what can never be sent. Kota witnesses; nothing is mailed.',
  'free',
  'emotional',
  'directed_writing',
  4,
  'Capacity Erosion,Alignment Fracture,High Output Hidden Instability',
  'flag:grief_mode_active; flag:recovery_mode_active; flag:transition_flag'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."pathSession" (id, "pathId", index, title, "coachingText", "microCommitment") VALUES
(
  'd1a2b3c4-5e6f-7081-9203-a4b5c6d7e8f9',
  'c8e1f0a2-4b3d-5e6f-9a0b-1c2d3e4f5a6b',
  1,
  'Who is this letter to, and why now?',
  'This is a Directed Writing path. Kota is a witness and reflection partner — not a coach pushing insight. The letter is never sent. Session 1: Name who this is for and why this moment is the right time to write it. There is no wrong answer. Stay with the naming.',
  'Write one sentence naming who the letter is for — only for yourself.'
),
(
  'e2b3c4d5-6f70-8192-a304-b5c6d7e8f901',
  'c8e1f0a2-4b3d-5e6f-9a0b-1c2d3e4f5a6b',
  2,
  'What has never been said?',
  'Session 2 of the Unsent Letter. Write toward what has stayed unspoken. Kota holds space. Do not polish. Do not send. Let the unfinished sentences stand.',
  'Write three unfinished sentences that start with "I never told you..."'
),
(
  'f3c4d5e6-7081-92a3-b405-c6d7e8f90102',
  'c8e1f0a2-4b3d-5e6f-9a0b-1c2d3e4f5a6b',
  3,
  'What do you want them to know?',
  'Session 3: What do you want this person — or this version of yourself — to know? Speak plainly. Kota reflects only what you ask to have reflected.',
  'Write one paragraph that begins with "What I most want you to know is..."'
),
(
  'a4d5e6f7-8192-a3b4-c506-d7e8f9010203',
  'c8e1f0a2-4b3d-5e6f-9a0b-1c2d3e4f5a6b',
  4,
  'What do you want for yourself now?',
  'Session 4: Turn toward yourself. What do you want for yourself now that this has been written? Optionally save the letter to your private journal, or discard it. Either choice is complete.',
  'Decide: save this letter to your journal, or discard it. Name one thing you want for yourself now.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."pathQuestion" (id, "sessionId", index, "questionText") VALUES
('b5e6f708-92a3-b4c5-d607-e8f901020304', 'd1a2b3c4-5e6f-7081-9203-a4b5c6d7e8f9', 1, 'Who is this letter to — a person, a past self, a chapter — and why is now the time?'),
('c6f70819-a3b4-c5d6-e708-f90102030405', 'e2b3c4d5-6f70-8192-a304-b5c6d7e8f901', 1, 'What has never been said that still sits with you?'),
('d708192a-b4c5-d6e7-f809-010203040506', 'f3c4d5e6-7081-92a3-b405-c6d7e8f90102', 1, 'What do you most want them to know?'),
('e8192a3b-c5d6-e7f8-0910-020304050607', 'a4d5e6f7-8192-a3b4-c506-d7e8f9010203', 1, 'What do you want for yourself now that this has been written?')
ON CONFLICT (id) DO NOTHING;
