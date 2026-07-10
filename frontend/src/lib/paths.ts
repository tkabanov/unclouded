import pathHardSeasons from "@/assets/path-hard-seasons.jpg";
import { TIER, type TierSlug } from "@/lib/enums/tier";

export interface PathSession {
  id: string;
  number: number;
  title: string;
  coaching_text: string;
  questions: string[];
  micro_commitment: string;
  micro_commitment_note?: string;
}

export interface CoachingPath {
  slug: string;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  pillar: "stability" | "performance" | "alignment" | "recovery" | "grief";
  /** Bubble path.tier — used by paths grid tier filter (PATHS-02). */
  tier: TierSlug;
  /** Bubble path.subMode — optional badge on path cards. */
  subMode?: string;
  duration: string;
  image: string;
  sessions: PathSession[];
}

export const HARD_SEASONS_PATH: CoachingPath = {
  slug: "hard-seasons",
  code: "S1",
  title: "Hard Seasons",
  subtitle: "Moving through periods when the load exceeds the capacity",
  description:
    "A six-session path for honestly meeting yourself in a hard season — without pushing through or shutting down. Built around small, sustainable shifts.",
  pillar: "stability",
  tier: TIER.FREE,
  subMode: "Guided",
  duration: "6 sessions · ~6 weeks",
  image: pathHardSeasons,
  sessions: [
    {
      id: "s1-1",
      number: 1,
      title: "Understanding what hard seasons actually are",
      coaching_text: `Hard seasons don't announce themselves. They tend to arrive gradually — you just notice one day that everything feels heavier than it used to. The things that used to restore you aren't restoring you. The pace you used to sustain feels impossible. And somewhere underneath all of it is a quiet voice wondering if something is wrong with you.

Nothing is wrong with you. You are in a hard season. That is different.

A hard season is a period where the load exceeds the capacity. It is not a character flaw, a weakness, or a sign that you are falling apart. It is a signal — from your body, your nervous system, your life — that something needs to change. The season is telling you something. The first step is simply learning to hear it.

Most people in hard seasons do one of two things. They push through — keeping the same pace, telling themselves they just need to work harder or rest better or get themselves together. Or they shut down — withdrawing, avoiding, going through the motions without actually being present. Neither of these works.

There is a third option. It does not require you to have it figured out. It just requires you to be honest about where you actually are. That is where we start.`,
      questions: [
        "When you think about the past few weeks, what has felt the heaviest? Name it as specifically as you can.",
        "What have you been telling yourself about why you're struggling — what story are you running about yourself right now?",
        "What is one thing you wish someone understood about what you're carrying?",
      ],
      micro_commitment:
        "This week: notice one moment when you push through something instead of acknowledging it. Just notice. You don't have to change it yet — just see it.",
    },
    {
      id: "s1-2",
      number: 2,
      title: "Permission to slow down without falling apart",
      coaching_text: `There is a difference between slowing down and stopping. Between rest and collapse. Between allowing yourself to be in a hard season and giving up on yourself.

Most people in hard seasons are afraid that if they slow down, everything will fall apart. The work won't get done. The people depending on them will notice. They'll fall so far behind they can't catch up. So they keep the pace even when the pace is destroying them.

Here is what is actually true: the pace you are keeping right now is already costing you more than you are getting from it. The slowdown has already started — it is just happening in ways you can't fully see yet. Your sleep, your patience, your clarity, your energy — these are already affected. Slowing down deliberately is not giving in. It is choosing when and how the adjustment happens, rather than waiting for your body or your life to make the choice for you.

Slowing down does not mean everything stops. It means deciding what actually has to happen and what can wait. It means protecting one thing — just one — that restores you. It means dropping the performance of being fine and being honest about what you actually have to give right now.

You are allowed to do less. That is not failure. That is survival. And survival, right now, is the goal.`,
      questions: [
        "What are you most afraid will happen if you slow down?",
        "If you were advising a close friend in exactly your situation, what would you tell them they're allowed to let go of right now?",
        "What is one thing you are currently doing that is costing more than it is giving?",
      ],
      micro_commitment:
        "This week: identify one thing from your list that you can do less of — not permanently, just this week. Do it less. Notice what happens.",
    },
    {
      id: "s1-3",
      number: 3,
      title: "The minimum viable day — what actually matters right now",
      coaching_text: `When everything feels like too much, the question is not how to do everything. The question is what actually has to happen.

Most people, when overwhelmed, have a list of obligations that they treat as equally urgent. Everything on the list feels important because everything on the list is real. But not everything on the list has the same consequence if it doesn't happen. Some things, if they don't happen today, will create real problems. Most things, if they don't happen today, will still be there tomorrow.

The minimum viable day is the version of your day that keeps the most important things going without requiring you to perform at a level you currently cannot sustain. It is not a lazy day. It is a realistic day. It is a day designed by someone who knows what they actually have to give, rather than designed by the aspirational version of themselves who ignores what they feel.

To find your minimum viable day, you need to be honest about two things: what genuinely cannot wait, and what you have been treating as essential that is actually optional. Most people, when they do this honestly, find that the non-negotiable list is shorter than they thought. And the relief that comes from that recognition is real.`,
      questions: [
        "List three things that genuinely cannot go undone this week — the ones where skipping them creates real consequences.",
        "List three things you've been treating as essential but could probably wait, be delegated, or be dropped entirely.",
        "What does a realistic day look like for you right now — not ideal, not aspirational, just genuinely doable?",
      ],
      micro_commitment:
        "This week: write your minimum viable day for tomorrow. Just tomorrow. Three things that have to happen, and permission to leave the rest.",
    },
    {
      id: "s1-4",
      number: 4,
      title: "Finding one small anchor in the chaos",
      coaching_text: `When everything is unstable, the impulse is to try to stabilize everything at once. That impulse is understandable. It is also part of why hard seasons feel so relentless — the scale of what needs to be different makes any single step feel inadequate.

The anchor principle is the opposite of that. Instead of trying to stabilize everything, you identify one thing — one practice, one rhythm, one commitment — that you can hold even when everything else is shifting. Not because one thing will fix everything. But because one reliable thing in an unreliable period changes the felt experience of the season.

The anchor can be small. It should be small. A walk at the same time every morning. Making your bed. Eating something real before noon. Calling one person. Going to bed before midnight. The specific thing matters less than the reliability. The anchor works because it is something you do when you feel like doing it and when you don't. Its value is in the consistency, not in the content.

When you have an anchor, you have evidence — physical, repeated evidence — that you can do something. That might sound like nothing. In a hard season, it is everything.`,
      questions: [
        "What is one thing you have managed to keep going even through this difficult period — something small that you have not completely let go of?",
        "What is one small practice that, when you do it consistently, makes everything else feel slightly more manageable?",
        "What would you need to make that practice non-negotiable this week — what would have to be true?",
      ],
      micro_commitment:
        "This week: choose your anchor. One small thing. Do it every day this week regardless of how you feel. Report back.",
    },
    {
      id: "s1-5",
      number: 5,
      title: "Reaching out without feeling like a burden",
      coaching_text: `One of the most common experiences of hard seasons is isolation. Not always external isolation — plenty of people in hard seasons are surrounded by others. But an internal isolation. The sense that what you are carrying is yours alone to carry. That telling someone would burden them, worry them, or change how they see you.

This belief is almost always wrong. And it is costing you more than you know.

The people who love you — or who care about you, or who would want to know — are generally not as fragile as you are treating them. They can hold what you are carrying if you give them the chance. What they cannot do is help with something they don't know exists. Your silence is not protecting them. In most cases, it is just protecting you from the vulnerability of being known.

Reaching out does not require you to have the words perfectly. It does not require you to know what you need. It can be as simple as: I've been having a hard time and I wanted to tell you that. That is it. You don't have to ask for anything. You don't have to explain everything. Just break the isolation. That is enough.`,
      questions: [
        "Who in your life would genuinely want to know that you are having a hard time right now?",
        "What stops you from reaching out to them — what is the specific fear or concern?",
        "What is the smallest version of reaching out that feels possible — not the full conversation, just the first move?",
      ],
      micro_commitment:
        "This week: reach out to one person. It can be a text. It can be three sentences. Just break the isolation once.",
    },
    {
      id: "s1-6",
      number: 6,
      title: "What forward looks like when you're depleted",
      coaching_text: `Forward does not always look like progress. In a hard season, forward can look like maintaining. Like not losing more ground. Like keeping one thing going. Like getting through the day and being slightly more honest about how you feel. These count.

The trap of hard seasons is that people measure forward against the version of themselves that existed before the season started. They compare current output to peak output. Current energy to peak energy. And by that measure, they are always failing. They are always behind. They are always not enough.

The more useful measure is: compared to where I was at the lowest point of this hard season, what is different? What am I doing now that I couldn't do then? What has held? What has slowly gotten easier? What have I learned about myself in this period that I didn't know before?

Hard seasons end. Most of them. And when they do, something is usually different — not just in your circumstances but in you. Not because hard seasons are good. They aren't always. But because surviving something genuinely difficult changes you, whether you choose it or not. The question is whether you let it change you in a direction you would choose.

You made it through this path. That is not nothing.`,
      questions: [
        "Looking back at the past few weeks since you started this path — what is one thing that feels even slightly different?",
        "What have you learned about yourself during this hard season that you didn't know before, or didn't believe before?",
        "What is the one thing you most want to carry forward from this period into whatever comes next?",
      ],
      micro_commitment:
        "Before your next coaching session, take five minutes to write down one thing you are proud of from this hard season. It doesn't have to be big.",
      micro_commitment_note: "Closing commitment — no action required. You made it through this path.",
    },
  ],
};

export const ALL_PATHS: CoachingPath[] = [HARD_SEASONS_PATH];

export function getPathBySlug(slug: string): CoachingPath | undefined {
  return ALL_PATHS.find((p) => p.slug === slug);
}
