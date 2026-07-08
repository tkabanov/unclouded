import { AI_COACHING_MODE, type AiCoachingModeSlug } from "@/lib/enums/coachingMode";

/** Canonical demo resource rows shared by paths library and admin resources console. */
export type DemoResourceSeed = {
  resourceId: string;
  title: string;
  content: string;
  primaryModeTag: string;
  subModeTag: string;
  coachingMode: AiCoachingModeSlug;
  sensitivity: "low" | "moderate" | "high";
  sensitivityFlag: string;
  isFree: boolean;
  isCrisis: boolean;
  externalLink?: string;
};

export const DEMO_RESOURCE_SEED: DemoResourceSeed[] = [
  {
    resourceId: "res-grounding-54321",
    title: "5-4-3-2-1 Grounding Exercise",
    content:
      "A simple sensory grounding technique to help you stay present during moments of stress or anxiety.",
    primaryModeTag: "Mindfulness",
    subModeTag: "Anxiety",
    coachingMode: AI_COACHING_MODE.STABILIZER,
    sensitivity: "low",
    sensitivityFlag: "Low sensitivity",
    isFree: true,
    isCrisis: false,
  },
  {
    resourceId: "res-sleep-hygiene",
    title: "Sleep Hygiene Checklist",
    content:
      "Evidence-based habits to improve sleep quality — consistent schedule, wind-down routine, and environment tips.",
    primaryModeTag: "Wellness",
    subModeTag: "Sleep",
    coachingMode: AI_COACHING_MODE.SIMPLIFIER,
    sensitivity: "low",
    sensitivityFlag: "Low sensitivity",
    isFree: true,
    isCrisis: false,
  },
  {
    resourceId: "res-boundary-scripts",
    title: "Healthy Boundary Scripts",
    content:
      "Conversation starters and phrases for setting boundaries with family, work, and relationships.",
    primaryModeTag: "Relationships",
    subModeTag: "Communication",
    coachingMode: AI_COACHING_MODE.REBUILDER,
    sensitivity: "moderate",
    sensitivityFlag: "Moderate sensitivity",
    isFree: false,
    isCrisis: false,
  },
];
