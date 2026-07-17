import type { ModuleDefinition } from "../moduleConfigTypes";
import { numericScaleOptions, singleSelectOptions } from "./questionHelpers";

export const meaningModule: ModuleDefinition = {
  slug: "meaning",
  displayTitle: "What Holds You",
  aiShortName: "What Holds You",
  headline: "What gives you meaning and what you reach for when things get hard",
  sub: "These are the questions most apps never ask. They're not religious or prescriptive — they're about what anchors you, what you're living toward, and what you draw on when the usual things don't work.",
  tone: "Open. Non-prescriptive. No assumptions about faith, belief, or spiritual framework.",
  sensitivityTier: "standard",
  presentationCopy: "The deepest layer: what gives you meaning and what you reach for",
  defaultUnlockDay: 30,
  completeFlagColumn: "moduleMeaningComplete",
  onboardingCompleteFlag: "module_meaning_complete",
  estimatedMinutes: 8,
  sideEffects: [
    {
      type: "set_profile_boolean",
      column: "spiritualFrameworkPresent",
      when: { fieldKey: "spiritualFrameworkType", notEquals: "no" },
    },
  ],
  questions: [
    {
      id: "mq1",
      prompt: "How would you describe your current relationship with a sense of purpose?",
      kind: "single_select",
      fieldKey: "purposeClarity",
      options: singleSelectOptions([
        { slug: "clear", label: "Clear — I know what I'm here for and it guides how I live most days" },
        { slug: "searching", label: "Searching — I sense there's something but I'm still finding it" },
        { slug: "lost", label: "Lost — I've lost the thread of what my life is for right now" },
        { slug: "rebuilding", label: "Rebuilding — I had clarity before and I'm working to reconnect with it" },
      ]),
    },
    {
      id: "mq2",
      prompt: "Do you have a spiritual, faith, or meaning-making framework that you draw on?",
      kind: "single_select",
      fieldKey: "spiritualFrameworkType",
      options: singleSelectOptions([
        { slug: "active", label: "Yes — it's active and real in my daily life" },
        { slug: "background", label: "Yes — it's present but more in the background than the foreground" },
        {
          slug: "complicated",
          label: "Complicated — I grew up with one but my relationship to it has changed significantly",
        },
        { slug: "no", label: "No — I don't have a spiritual or faith framework" },
        { slug: "exploring", label: "I'm exploring — this is something I'm actively working through right now" },
      ]),
    },
    {
      id: "mq3",
      prompt:
        "How much do you feel genuinely part of something larger than yourself — a community, a cause, a group of people with shared purpose?",
      kind: "single_select",
      fieldKey: "belongingLevel",
      options: singleSelectOptions([
        { slug: "strong", label: "Strongly — I have real belonging and it matters to how I function" },
        { slug: "moderate", label: "Somewhat — I have some connection but it doesn't feel deep or consistent" },
        { slug: "weak", label: "Barely — I feel mostly unconnected from anything larger than my immediate life" },
        { slug: "absent", label: "Not at all — I feel genuinely isolated from any sense of community or shared purpose" },
      ]),
    },
    {
      id: "mq4",
      prompt: "When things get really hard — beyond your normal stress — what do you actually reach for?",
      kind: "single_select",
      fieldKey: "pressureReach",
      options: singleSelectOptions([
        { slug: "faith", label: "Faith or spiritual practice — prayer, meditation, or spiritual community" },
        { slug: "people", label: "People — I reach for connection, someone who knows me" },
        { slug: "work", label: "Work or productivity — doing something feels better than sitting with it" },
        { slug: "substances", label: "Substances or numbing — alcohol, food, screens, anything to take the edge off" },
        { slug: "avoidance", label: "Avoidance — I pull back and hope it passes" },
        { slug: "solitude", label: "Solitude — I go inward and process alone" },
      ]),
    },
    {
      id: "mq5",
      prompt: "How open or closed does the future feel to you right now?",
      kind: "numeric_scale",
      fieldKey: null,
      options: numericScaleOptions([
        "Completely closed — I can't see a positive future from where I stand",
        "Mostly closed — hope is present but thin",
        "Uncertain — the future is unclear but not foreclosed",
        "Mostly open — I can see real possibility even with current uncertainty",
        "Open — the future feels full of possibility and I'm oriented toward it",
      ]),
    },
    {
      id: "mq6",
      prompt: "How meaningful does your daily life feel right now — not just busy or productive, but genuinely meaningful?",
      kind: "numeric_scale",
      fieldKey: null,
      options: numericScaleOptions([
        "Not meaningful — I feel like I'm just going through the motions with no real sense of why",
        "Rarely — glimpses of meaning but it's not the dominant texture of my days",
        "Sometimes — some things feel meaningful, others are just motion",
        "Often — most days have a thread of meaning I can feel",
        "Deeply — my life feels genuinely meaningful and I know why I'm doing what I'm doing",
      ]),
    },
    {
      id: "mq7",
      prompt: "How would you describe your relationship with your own mortality — the fact that your time is finite?",
      kind: "single_select",
      fieldKey: null,
      options: singleSelectOptions([
        { slug: "active_motivator", label: "It motivates me — knowing time is finite makes me more intentional about how I live" },
        { slug: "background", label: "It's in the background but doesn't significantly shape my choices" },
        { slug: "avoided", label: "I don't think about it — I avoid the topic" },
        { slug: "anxiety_producing", label: "It produces anxiety or fear when I consider it" },
        { slug: "complicated", label: "It's complicated — I'm in a season where mortality feels more present than I'd like" },
      ]),
    },
  ],
};
