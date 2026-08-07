// Classification logic for onboarding results

import { extractLoadSignalSlugs } from "@/lib/enums/onboardingQuestions";
import { STATE_NERVOUS_SYSTEM } from "@/lib/enums/wellnessState";
import { resolvePressureProfile } from "@/lib/userProfile/buildPressureProfile";

export interface ClassificationType {
  key: string;
  name: string;
  tagline: string;
  tradeoff: string;
  whatThisMeans: string;
  focusAreas: string[];
  /** @deprecated Prefer `tagline`. Kept for older persisted JSONB shapes. */
  description?: string;
}

export interface ResultsData {
  stability_score: number;
  performance_score: number;
  alignment_score: number;
  orientation_score: number;
  pressure_profile: string;
  tradeoff_statement: string;
  classification: ClassificationType;
  recovery_mode_active: boolean;
  grief_mode_active: boolean;
  trauma_informed_mode: boolean;
  first_module: string;
  module_days: number;
}

/** Classification output without module scheduler preview (filled by caller at onboarding). */
export type CoreResultsData = Omit<ResultsData, "first_module" | "module_days">;

/** Standing disclaimer on every results screen (not classification-triggered). */
export const STANDING_RESULTS_DISCLAIMER =
  "Uncloud360 provides AI-powered coaching guidance only — not therapy, diagnosis, or medical advice. If you are in crisis, please call or text 988.";

export const classifications: Record<string, ClassificationType> = {
  high_output_hidden_instability: {
    key: "high_output_hidden_instability",
    name: "High Output / Hidden Instability",
    tagline:
      "You're delivering on the outside. Internally, the gap between how you look and how you feel is where the real work begins.",
    tradeoff:
      "Right now, your output is outpacing your foundation. The question isn't whether you can keep performing — you clearly can. It's whether the pace you're keeping is one you can actually sustain.",
    whatThisMeans:
      "You're performing well and people around you likely have no idea what it's costing you. That's the nature of this pattern — it doesn't announce itself. Naming it now, before it does, is exactly the right move.",
    focusAreas: [
      "Close the gap between external performance and internal state",
      "Reintroduce honest self-check-ins without judgment",
      "Build sustainable rhythms that match your actual capacity — not your output expectations",
    ],
  },
  capacity_erosion: {
    key: "capacity_erosion",
    name: "Capacity Erosion",
    tagline:
      "You've been carrying more than your system can sustainably hold. The fact that you're still functioning is a testament to your resilience — and also the problem.",
    tradeoff:
      "Right now, functioning is the goal. Growth costs energy that doesn't currently exist. The most important thing you can do right now is stop asking yourself to do more — and start asking yourself what can come off.",
    whatThisMeans:
      "This isn't a discipline problem or a mindset problem. Your system is genuinely depleted. Pushing harder from here doesn't produce more — it produces breakdown. The first work is stabilization, not optimization.",
    focusAreas: [
      "Stabilize before anything else — no new goals, no new commitments right now",
      "Identify what is draining you that can be reduced, removed, or redistributed",
      "Build one small recovery practice that actually fits your current life",
    ],
  },
  alignment_fracture: {
    key: "alignment_fracture",
    name: "Alignment Fracture",
    tagline:
      "Something deeper is off. You may be functioning, or even performing — but the life you're living doesn't quite fit the person you know yourself to be.",
    tradeoff:
      "Right now, the gap between who you are and how you're living is the source of the friction. It's not a performance problem. It's an alignment problem — and those require a different kind of work.",
    whatThisMeans:
      "The discomfort you're feeling isn't a sign that something is wrong with you. It's a signal that something important is out of place. The work here isn't to fix yourself — it's to find the thread and follow it back to what actually matters.",
    focusAreas: [
      "Name what is misaligned before trying to change it",
      "Reconnect with the values that have always been non-negotiable for you",
      "Build small, daily proof points that your life can start to reflect who you actually are",
    ],
  },
  performance_stagnation: {
    key: "performance_stagnation",
    name: "Performance Stagnation",
    tagline: "You know what you need to do. The gap between knowing and doing is where the real work lives.",
    tradeoff:
      "Right now, understanding isn't the problem — execution is. More insight won't close the gap. Structure, accountability, and a different relationship with starting will.",
    whatThisMeans:
      "This isn't a motivation problem and it isn't a character flaw. You're navigating a very specific pattern — and the approaches you've been using to break through it are probably the same ones that haven't worked before. Something different is needed here, not more of the same.",
    focusAreas: [
      "Identify the specific point where follow-through breaks down — the gap is almost always in the same place",
      "Build accountability structures that don't depend on willpower alone",
      "Make the next action smaller than feels necessary — then do it",
    ],
  },
  comfortable_plateau: {
    key: "comfortable_plateau",
    name: "Comfortable Plateau",
    tagline:
      "Things are okay. And okay usually has a quiet, accumulating cost that doesn't announce itself until it's been sitting there a long time.",
    tradeoff:
      "Right now, comfort is real — but so is the cost of staying still. The question isn't whether things are bad. It's whether this is actually the life you want, or whether you've quietly stopped asking that question.",
    whatThisMeans:
      "You're not in crisis. There's nothing obviously wrong. And that's exactly what makes this pattern easy to miss. The friction isn't pain — it's a low-grade sense that you're capable of more than this, and that you've been trading that potential for stability. That's worth looking at honestly.",
    focusAreas: [
      "Name honestly what okay is costing you — not dramatically, just truthfully",
      "Identify the one area where you've stopped pushing that used to matter most",
      "Take one step toward growth that feels slightly uncomfortable — not a leap, a step",
    ],
  },
  building_momentum: {
    key: "building_momentum",
    name: "Building Momentum",
    tagline:
      "You're oriented toward growth and things are moving. The work now is consistency — keeping what's working working.",
    tradeoff:
      "Right now, the gap isn't direction — it's consistency. You know where you want to go. The question is whether the habits and structures you have in place are strong enough to get you there without depending on motivation to show up every day.",
    whatThisMeans:
      "This is a genuinely good place to be. You have momentum and you have orientation — that combination is rarer than it sounds. The risk at this stage isn't falling behind. It's overextending, losing the thread, or getting distracted by what looks like a better path. Protect what's working while you build.",
    focusAreas: [
      "Identify your one highest-leverage action and protect time for it",
      "Build the return into every commitment — not if you miss a day, when",
      "Watch for the patterns that have knocked you off course before and name them before they do it again",
    ],
  },
  optimization_ready: {
    key: "optimization_ready",
    name: "Optimization Ready",
    tagline:
      "Your foundation is solid and you're genuinely ready to stretch. The question now is where to apply the edge.",
    tradeoff:
      "Right now, the ceiling isn't your capacity — it's your clarity about where to push. You have the foundation. The work is precision: identifying where the highest-leverage growth lives and going there with full commitment.",
    whatThisMeans:
      "You're operating from a strong base. This isn't the moment for more reflection or more analysis — it's the moment to move. The most valuable thing you can do right now is identify the one area where you're most ready to stretch and commit to it fully, rather than distributing effort across everything equally.",
    focusAreas: [
      "Identify the one dimension — professional, relational, or personal — where growth would create the most meaningful change",
      "Set a 90-day target that requires you to stretch, not just maintain",
      "Build in a challenge mechanism — someone or something that will hold you to the higher standard",
    ],
  },
};

/**
 * Prefer live Results Screen Copy by classification key so stale profiles.results
 * JSONB (old description/focusAreas) still renders current copy.
 */
export function resolveClassificationCopy(
  keyOrClassification: string | ClassificationType | null | undefined,
): ClassificationType | null {
  if (!keyOrClassification) return null;

  const key =
    typeof keyOrClassification === "string"
      ? keyOrClassification.trim()
      : keyOrClassification.key?.trim() ?? "";

  if (key && classifications[key]) {
    return classifications[key];
  }

  if (typeof keyOrClassification === "object") {
    const stale = keyOrClassification;
    return {
      key: stale.key,
      name: stale.name,
      tagline: stale.tagline ?? stale.description ?? "",
      tradeoff: stale.tradeoff ?? "",
      whatThisMeans: stale.whatThisMeans ?? stale.description ?? "",
      focusAreas: Array.isArray(stale.focusAreas) ? stale.focusAreas : [],
      description: stale.tagline ?? stale.description,
    };
  }

  return null;
}

// Dashboard configuration per classification
export interface DashboardConfig {
  crisisBarProminent: boolean;
  tradeoffAlwaysProminent: boolean;
  tradeoffFraming: string;
  deemphasizePerformance: boolean;
  emphasizePerformance: boolean;
  forcePillar: string | null;
  gidgetCta: string;
  checkinQuestions: number;
  checkinExtraQuestion: string | null;
  noUrgency: boolean;
  noProductivityLanguage: boolean;
  paths: { name: string; description: string }[];
  showStretchGoals: boolean;
  showPremiumUpsell: boolean;
  showConsistencyStreak: boolean;
  showProgressDelta: boolean;
  stabilityWarning: boolean;
  modulesToSurface: string[];
}

export function getDashboardConfig(classification: ClassificationType, flags: {
  recovery_mode_active: boolean;
  grief_mode_active: boolean;
  trauma_informed_mode: boolean;
}): DashboardConfig {
  const base: DashboardConfig = {
    crisisBarProminent: false,
    tradeoffAlwaysProminent: false,
    tradeoffFraming: "",
    deemphasizePerformance: false,
    emphasizePerformance: false,
    forcePillar: null,
    gidgetCta: "Start a coaching session",
    checkinQuestions: 3,
    checkinExtraQuestion: null,
    noUrgency: false,
    noProductivityLanguage: false,
    paths: [],
    showStretchGoals: true,
    showPremiumUpsell: false,
    showConsistencyStreak: false,
    showProgressDelta: false,
    stabilityWarning: false,
    modulesToSurface: ["Know Yourself Deeper"],
  };

  switch (classification.key) {
    case "capacity_erosion":
      return {
        ...base,
        crisisBarProminent: true,
        tradeoffAlwaysProminent: true,
        deemphasizePerformance: true,
        forcePillar: "emotional",
        gidgetCta: "A space to be heard — no pressure, no agenda",
        checkinQuestions: 1,
        noUrgency: true,
        noProductivityLanguage: true,
        showStretchGoals: false,
        paths: [
          { name: "Stress Regulation Foundations", description: "Build your baseline calm" },
          { name: "Sleep & Recovery Basics", description: "Restore capacity through rest" },
        ],
      };
    case "performance_stagnation":
      return {
        ...base,
        tradeoffFraming: "action-forward",
        emphasizePerformance: true,
        gidgetCta: "Let's get unstuck — your coach is ready",
        checkinExtraQuestion: "Did you do the thing?",
        paths: [
          { name: "Clarity & Priority Reset", description: "Cut through the noise" },
          { name: "Follow-Through Systems", description: "Close the gap between intention and action" },
        ],
      };
    case "alignment_fracture":
      return {
        ...base,
        tradeoffFraming: "identity",
        gidgetCta: "Let's find the thread — what actually matters to you",
        modulesToSurface: ["Identity Lens", "What Holds You"],
        paths: [
          { name: "Values Excavation", description: "Uncover what truly drives you" },
          { name: "Purpose Discovery", description: "Find your north star" },
        ],
      };
    case "high_output_hidden_instability":
      return {
        ...base,
        tradeoffAlwaysProminent: true,
        stabilityWarning: true,
        paths: [
          { name: "High Performance Sustainability", description: "Protect your engine" },
          { name: "Stress Regulation Foundations", description: "Build sustainable capacity" },
        ],
        gidgetCta: "Your output is real. Let's make it sustainable.",
      };
    case "optimization_ready":
      return {
        ...base,
        tradeoffFraming: "opportunity",
        showPremiumUpsell: true,
        gidgetCta: "You're in a strong position. Let's identify your next edge.",
        paths: [
          { name: "Optimization Protocol", description: "Apply your edge with precision" },
          { name: "Strategic Focus System", description: "Sharpen your edge" },
        ],
      };
    case "comfortable_plateau":
      return {
        ...base,
        noUrgency: true,
        checkinExtraQuestion: "What would make today feel more like yours?",
        gidgetCta: "No rush. Let's explore what's next when you're ready.",
        paths: [
          { name: "Life Direction Reset", description: "Recalibrate your compass" },
          { name: "Values Excavation", description: "Reconnect with what matters" },
        ],
      };
    case "building_momentum":
      return {
        ...base,
        showConsistencyStreak: false,
        showProgressDelta: true,
        gidgetCta: "You're ready to move. Let's find your highest leverage.",
        paths: [
          { name: "Follow-Through Mastery", description: "Lock in your progress" },
          { name: "Strategic Focus System", description: "Sustain and grow" },
        ],
      };
    default:
      return base;
  }
}

/**
 * Top 2 recommended path names: engine matches first, then dashboard-config fallback.
 */
export function resolveRecommendedPathNames(
  matchedNames: string[],
  classification: ClassificationType,
  flags: {
    recovery_mode_active: boolean;
    grief_mode_active: boolean;
    trauma_informed_mode: boolean;
  },
  limit = 2,
): string[] {
  const names = matchedNames.map((n) => n.trim()).filter(Boolean);
  if (names.length >= limit) return names.slice(0, limit);

  const fallback = getDashboardConfig(classification, flags).paths.map((p) => p.name);
  const merged = [...names];
  for (const name of fallback) {
    if (merged.length >= limit) break;
    if (!merged.some((n) => n.toLowerCase() === name.toLowerCase())) {
      merged.push(name);
    }
  }
  return merged.slice(0, limit);
}

function computePressureProfile(
  loadSignals: Record<string, string>,
  stateSignals: Record<string, string>,
  _behavioralPatterns: Record<string, string>
): string {
  const loadSignalSlugs = extractLoadSignalSlugs(loadSignals);
  const nervousSystemSlug =
    stateSignals.nervous_system_state ?? STATE_NERVOUS_SYSTEM.REGULATED;
  return resolvePressureProfile(loadSignalSlugs, nervousSystemSlug);
}

/** Shared classification engine — Step 12, persist pipeline, and reassessment. */
export function computeClassification(
  stability: number,
  performance: number,
  alignment: number,
  pressureProfile: string
): ClassificationType {
  // Capacity Erosion: low stability + system overload
  if (stability < 3.0 && pressureProfile === "System Overload") {
    return classifications.capacity_erosion;
  }
  // High Output / Hidden Instability: performing well but unstable
  if (stability < 3.2 && performance >= 3.5) {
    return classifications.high_output_hidden_instability;
  }
  // Alignment Fracture: low alignment with decent other scores
  if (alignment < 3.0 && performance >= 3.0) {
    return classifications.alignment_fracture;
  }
  // Performance Stagnation: stability okay but performance lagging
  if (performance < 3.0 && stability >= 3.0) {
    return classifications.performance_stagnation;
  }
  // Optimization Ready: strong across all three
  if (stability >= 3.8 && performance >= 3.8 && alignment >= 3.8) {
    return classifications.optimization_ready;
  }
  // Building Momentum: good scores, upward trajectory
  if (stability >= 3.5 && performance >= 3.5 && alignment >= 3.5) {
    return classifications.building_momentum;
  }
  // Comfortable Plateau: moderate everywhere, nothing critical
  if (stability >= 3.2 && performance >= 3.0 && alignment >= 3.0) {
    return classifications.comfortable_plateau;
  }
  // Fallback logic
  if (stability < performance) return classifications.high_output_hidden_instability;
  if (alignment < stability) return classifications.alignment_fracture;
  return classifications.capacity_erosion;
}

export function computeResults(
  stabilityScores: Record<string, number>,
  performanceScores: Record<string, number>,
  alignmentScores: Record<string, number>,
  orientationScore: number,
  loadSignals: Record<string, string>,
  stateSignals: Record<string, string>,
  behavioralPatterns: Record<string, string>,
  healthFlags: {
    recovery_mode_active: boolean;
    grief_mode_active: boolean;
    selected_flags: string[];
  }
): CoreResultsData {
  const stability = stabilityScores.stability_score ?? 3;
  const performance = performanceScores.performance_score ?? 3;
  const alignment = alignmentScores.alignment_score ?? 3;

  const pressureProfile = computePressureProfile(loadSignals, stateSignals, behavioralPatterns);
  const classification = computeClassification(stability, performance, alignment, pressureProfile);
  const resolved = resolveClassificationCopy(classification) ?? classification;

  const traumaFlags = ["trauma_history", "trauma_informed"];
  const trauma_informed_mode = healthFlags.selected_flags.some(f => traumaFlags.includes(f));

  return {
    stability_score: stability,
    performance_score: performance,
    alignment_score: alignment,
    orientation_score: orientationScore,
    pressure_profile: pressureProfile,
    tradeoff_statement: resolved.tradeoff,
    classification: resolved,
    recovery_mode_active: healthFlags.recovery_mode_active,
    grief_mode_active: healthFlags.grief_mode_active,
    trauma_informed_mode,
  };
}
