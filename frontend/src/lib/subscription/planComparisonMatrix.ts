import { TIER, type TierSlug } from "@/lib/enums/tier";

export type PlanComparisonCell = boolean;

export type PlanComparisonRow = {
  label: string;
  included: Record<TierSlug, PlanComparisonCell>;
};

export type PlanComparisonSection = {
  title: string;
  rows: PlanComparisonRow[];
};

function cells(
  free: boolean,
  pro: boolean,
  premium: boolean,
): Record<TierSlug, PlanComparisonCell> {
  return {
    [TIER.FREE]: free,
    [TIER.PRO]: pro,
    [TIER.PREMIUM]: premium,
  };
}

/** Lovable-style feature matrix for the subscription comparison table. */
export const PLAN_COMPARISON_SECTIONS: readonly PlanComparisonSection[] = [
  {
    title: "Core coaching",
    rows: [
      { label: "Complete PuP 360 diagnostic", included: cells(true, true, true) },
      { label: "7 AI coaching sessions per month", included: cells(true, false, false) },
      { label: "Unlimited AI coaching sessions", included: cells(false, true, true) },
      { label: "3 free-tier guided coaching paths", included: cells(true, false, false) },
      { label: "40+ Free & Pro guided paths", included: cells(false, true, true) },
      { label: "55 Premium-only guided paths", included: cells(false, false, true) },
    ],
  },
  {
    title: "Assessment & insights",
    rows: [
      { label: "All 6 deep-dive assessment modules", included: cells(true, true, true) },
      { label: "Personalized dashboard with scores", included: cells(true, true, true) },
      { label: "90-day reassessment", included: cells(false, true, true) },
      { label: "On-demand reassessment", included: cells(false, false, true) },
      { label: "Sub-dimension score breakdown", included: cells(false, false, true) },
      { label: "Score comparison & trajectory update", included: cells(false, true, true) },
      { label: "Behavioral fingerprint reveal", included: cells(false, false, true) },
    ],
  },
  {
    title: "Memory & tracking",
    rows: [
      { label: "Full relational memory system", included: cells(false, true, true) },
      { label: "Session continuity across chats", included: cells(false, true, true) },
      { label: "AI journal reflection notes", included: cells(false, true, true) },
      { label: "Basic milestone tracking", included: cells(true, true, true) },
      { label: "Path completion history", included: cells(false, false, true) },
      { label: "Score trend history", included: cells(false, false, true) },
    ],
  },
  {
    title: "Daily support",
    rows: [
      { label: "Daily check-in", included: cells(true, true, true) },
      { label: "Daily Kota messages & insights", included: cells(false, true, true) },
      { label: "Recovery & grief mode", included: cells(true, true, true) },
      { label: "Crisis resources", included: cells(true, true, true) },
    ],
  },
  {
    title: "Reporting",
    rows: [
      { label: "Basic PDF summary", included: cells(false, true, true) },
      { label: "Full PuP 360 PDF diagnostic report", included: cells(false, false, true) },
    ],
  },
  {
    title: "Human coaching",
    rows: [
      { label: "One group coaching session per month", included: cells(false, true, true) },
      { label: "1:1 sessions with the PuP coaching team", included: cells(false, false, true) },
      { label: "Coach matched by classification", included: cells(false, false, true) },
      { label: "Priority support & early access", included: cells(false, false, true) },
    ],
  },
];

export const PLAN_COMPARISON_TIERS: readonly TierSlug[] = [TIER.FREE, TIER.PRO, TIER.PREMIUM];
