import type { ModuleDefinition } from "../moduleConfigTypes";
import { singleSelectOptions } from "./questionHelpers";

export const historyModule: ModuleDefinition = {
  slug: "history",
  displayTitle: "Your History & Context",
  aiShortName: "History & Context",
  headline: "What shaped you is still shaping you",
  sub: "This is completely optional and entirely private. You don't have to name anything specific. These questions look at the larger context around your patterns — not to explain you away, but to understand you better.",
  tone: "Softest language of all modules. Never push. Present as 'available when you're ready'.",
  sensitivityTier: "high",
  presentationCopy: "Optional and private: what shaped you is still shaping you",
  defaultUnlockDay: 21,
  completeFlagColumn: "moduleHistoryComplete",
  onboardingCompleteFlag: "module_history_complete",
  estimatedMinutes: 8,
  sideEffects: [
    {
      type: "set_results_flag",
      flag: "trauma_informed_mode",
      when: { fieldKey: "traumaActivationLevel", equals: "active" },
    },
  ],
  questions: [
    {
      id: "hq1",
      prompt:
        "Some people carry experiences from the past that still show up in the present — in the body, in reactions, in patterns. Without needing to name anything specific, does that feel true for you?",
      kind: "single_select",
      fieldKey: "traumaActivationLevel",
      options: singleSelectOptions([
        { slug: "low", label: "Not really — my past feels processed or not particularly present in how I function now" },
        { slug: "present", label: "Somewhat — there are things back there that still influence me in ways I notice" },
        { slug: "active", label: "Yes — there are experiences that are still very much alive in how I respond and function" },
        { slug: "unsure", label: "I'm not sure — I haven't thought about it in these terms before" },
      ]),
    },
    {
      id: "hq2",
      prompt:
        "If you think about loss across your life — people, relationships, identities, versions of yourself you've had to let go — how much unprocessed grief do you sense you're carrying?",
      kind: "single_select",
      fieldKey: "griefLoadLevel",
      options: singleSelectOptions([
        { slug: "low", label: "Not much — what I've lost feels relatively integrated or distant" },
        { slug: "moderate", label: "Some — there are losses I haven't fully sat with or that still surface" },
        { slug: "high", label: "A significant amount — grief feels like a layer underneath many other things" },
        { slug: "unsure", label: "I'm not sure — this isn't a lens I've used to look at my life before" },
      ]),
    },
    {
      id: "hq3",
      prompt: "In the past 12 months, have any of the following happened? Select all that apply.",
      kind: "multi_select",
      fieldKey: "significantEvents12mo",
      options: singleSelectOptions([
        { slug: "major_loss", label: "Death of someone significant, or end of a major relationship" },
        { slug: "health_event", label: "Significant health diagnosis, illness, injury — yours or someone close" },
        { slug: "job_change", label: "Major career change, job loss, or financial disruption" },
        { slug: "living_change", label: "Significant move, housing change, or major logistical life disruption" },
        { slug: "family_change", label: "Birth of a child, major family crisis, or significant change in family structure" },
        { slug: "none", label: "None of these — the past 12 months have been relatively stable" },
      ]),
    },
    {
      id: "hq4",
      prompt: "Have you ever worked with a therapist, coach, counselor, or other professional support?",
      kind: "single_select",
      fieldKey: "priorSupportType",
      options: singleSelectOptions([
        { slug: "therapy", label: "Yes — therapy or counseling, and it was helpful" },
        { slug: "therapy_mixed", label: "Yes — therapy or counseling, with mixed or limited results" },
        { slug: "coaching", label: "Yes — coaching or similar, and it was helpful" },
        { slug: "coaching_mixed", label: "Yes — coaching or similar, with limited results" },
        { slug: "none", label: "No — I haven't worked with professional support before" },
        { slug: "open", label: "Not formally, but I'm open to it" },
      ]),
    },
    {
      id: "hq5",
      prompt: "When things have been really hard in the past, what has actually helped you get through?",
      kind: "single_select",
      fieldKey: null,
      options: singleSelectOptions([
        { slug: "people", label: "Other people — connection, support, being known by someone" },
        { slug: "action", label: "Taking action — doing something helped more than sitting with it" },
        { slug: "time", label: "Time — I needed space for things to naturally settle" },
        { slug: "meaning", label: "Meaning — finding a why or a frame that made sense of the difficulty" },
        { slug: "nothing", label: "Honestly, I'm not sure anything has — I've mostly just endured" },
        { slug: "mixed", label: "A combination — different things help in different situations" },
      ]),
    },
    {
      id: "hq6",
      prompt: "What hasn't worked when you've tried to get support or make changes in the past?",
      kind: "single_select",
      fieldKey: null,
      options: singleSelectOptions([
        { slug: "too_generic", label: "Generic advice that didn't account for my actual situation" },
        { slug: "not_ready", label: "I wasn't ready — the support was fine, I just couldn't use it then" },
        { slug: "felt_judged", label: "I felt judged or misunderstood in the process" },
        { slug: "surface_only", label: "It stayed surface-level — never got to what was actually going on" },
        { slug: "accountability", label: "I needed more accountability and structure than I got" },
        { slug: "no_barrier", label: "I don't have a specific barrier — I'm coming in relatively open" },
      ]),
    },
  ],
};
