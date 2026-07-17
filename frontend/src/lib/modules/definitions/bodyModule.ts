import type { ModuleDefinition } from "../moduleConfigTypes";
import { numericScaleOptions, singleSelectOptions } from "./questionHelpers";

export const bodyModule: ModuleDefinition = {
  slug: "body",
  displayTitle: "Your Body's Story",
  aiShortName: "Body's Story",
  headline: "What your body is carrying and trying to tell you",
  sub: "This isn't about fitness goals or weight. It's about the physical signals your system has been sending — and whether you've been able to hear them.",
  sensitivityTier: "standard",
  presentationCopy: "Your next step: what your body is carrying and trying to tell you",
  defaultUnlockDay: 5,
  completeFlagColumn: "moduleBodyComplete",
  onboardingCompleteFlag: "module_body_complete",
  estimatedMinutes: 8,
  sideEffects: [
    {
      type: "set_profile_boolean",
      column: "hormonalContextFlag",
      when: { fieldKey: "hormonalContextType", notEquals: "no" },
    },
  ],
  questions: [
    {
      id: "bq1",
      prompt:
        "How would you rate your sleep quality over the past few weeks — not just hours, but how rested you actually feel?",
      kind: "single_select",
      fieldKey: "sleepQualitySignal",
      options: singleSelectOptions([
        { slug: "good", label: "Good — I'm sleeping well and waking rested most days" },
        { slug: "fair", label: "Fair — inconsistent nights, sometimes okay, sometimes not" },
        { slug: "poor", label: "Poor — my sleep is disrupted, insufficient, or consistently unrestorative" },
      ]),
    },
    {
      id: "bq2",
      prompt:
        "Do you live with chronic pain, physical symptoms, or a physical health condition that affects your daily functioning?",
      kind: "single_select",
      fieldKey: "chronicPainFlag",
      options: singleSelectOptions([
        { slug: "yes_significant", label: "Yes — significantly. It shapes how I move through most days." },
        { slug: "yes_manageable", label: "Yes — but it's manageable. It's present but not dominant." },
        { slug: "sometimes", label: "Sometimes — flare-ups or intermittent symptoms that vary" },
        { slug: "no", label: "No — physical health is not a significant daily challenge right now" },
      ]),
    },
    {
      id: "bq3",
      prompt:
        "Are you currently navigating a significant hormonal or physiological transition that affects your energy, mood, or body?",
      kind: "single_select",
      fieldKey: "hormonalContextType",
      options: singleSelectOptions([
        { slug: "yes_perimenopause", label: "Yes — perimenopause or menopause and it's affecting how I function" },
        { slug: "yes_postpartum", label: "Yes — postpartum within the past 18 months" },
        { slug: "yes_other", label: "Yes — another significant hormonal or health transition I'm navigating" },
        { slug: "no", label: "No — I'm not in a significant transition like this right now" },
      ]),
    },
    {
      id: "bq4",
      prompt: "How would you describe your relationship with your physical body right now?",
      kind: "single_select",
      fieldKey: "bodyRelationship",
      options: singleSelectOptions([
        { slug: "connected", label: "Connected — I listen to my body and it generally feels like an ally" },
        { slug: "neutral", label: "Neutral — my body is just there. I don't think about it much." },
        { slug: "disconnected", label: "Disconnected — I feel cut off from physical signals or awareness" },
        { slug: "conflicted", label: "Conflicted — there's tension, judgment, or frustration in how I relate to my body" },
      ]),
    },
    {
      id: "bq5",
      prompt:
        "Beyond what you may have shared earlier about recovery, how would you describe your current relationship with alcohol, substances, or medication use?",
      kind: "single_select",
      fieldKey: "substancePatternSignal",
      options: singleSelectOptions([
        { slug: "none", label: "Not relevant — I don't use alcohol, substances, or have concerns here" },
        { slug: "managed", label: "Present and managed — I use alcohol or similar and feel in control of it" },
        { slug: "watching", label: "I'm watching it — use has crept up and I've noticed it" },
        { slug: "concerning", label: "Concerning — I'm aware my relationship with this isn't serving me well" },
      ]),
    },
    {
      id: "bq6",
      prompt: "How consistently are you moving your body in some form — walking, exercise, physical activity?",
      kind: "numeric_scale",
      fieldKey: null,
      options: numericScaleOptions([
        "Barely at all — almost no physical movement in my daily life",
        "Very little — occasional but inconsistent",
        "Some — a few times a week on better weeks",
        "Regular — I move my body consistently most weeks",
        "Strong — physical movement is a regular, meaningful part of how I function",
      ]),
    },
    {
      id: "bq7",
      prompt: "How much tension do you carry in your body on a typical day?",
      kind: "numeric_scale",
      fieldKey: null,
      options: numericScaleOptions([
        "Significant and constant — my body rarely feels loose or at ease",
        "Often tense — I notice physical holding through most of my day",
        "Some — certain times or situations bring it up",
        "Mild — I have tension but it's not the dominant physical experience",
        "Mostly relaxed — my body feels at ease most of the time",
      ]),
    },
  ],
};
