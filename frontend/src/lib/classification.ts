// Classification logic for onboarding results

import { resolvePressureProfile } from "@/lib/userProfile/buildPressureProfile";

export interface ClassificationType {
  key: string;
  name: string;
  description: string;
  focusAreas: string[];
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

export const classifications: Record<string, ClassificationType> = {
  capacity_erosion: {
    key: "capacity_erosion",
    name: "Capacity Erosion",
    description:
      "Your internal capacity is being stretched beyond what's sustainable right now. This isn't a character flaw — it's a system under load. The first priority is stabilization, not optimization.",
    focusAreas: [
      "Reduce cognitive and emotional load before adding new goals",
      "Rebuild daily recovery rituals that actually stick",
      "Identify the 1–2 changes that create the most relief fastest",
    ],
  },
  performance_stagnation: {
    key: "performance_stagnation",
    name: "Performance Stagnation",
    description:
      "You have the foundation, but forward motion has stalled. This isn't laziness — it's a signal that something in your system needs recalibrating. Clarity and follow-through are your leverage points.",
    focusAreas: [
      "Identify what's blocking consistent execution",
      "Rebuild commitment systems that match your energy",
      "Create accountability loops that don't rely on willpower",
    ],
  },
  alignment_fracture: {
    key: "alignment_fracture",
    name: "Alignment Fracture",
    description:
      "There's a disconnect between what you're doing and what actually matters to you. The discomfort you feel isn't failure — it's your values asking to be heard.",
    focusAreas: [
      "Reconnect with your core values beneath the noise",
      "Audit where your time and energy actually go vs. where they should",
      "Make one values-aligned decision this week and notice how it feels",
    ],
  },
  high_output_hidden_instability: {
    key: "high_output_hidden_instability",
    name: "High Output / Hidden Instability",
    description:
      "You're getting things done on the surface, but internally you're running on fumes. The gap between how you look and how you feel is where the real work begins.",
    focusAreas: [
      "Close the gap between external performance and internal state",
      "Reintroduce honest self-check-ins without judgment",
      "Build sustainable rhythms that match your actual energy",
    ],
  },
  optimization_ready: {
    key: "optimization_ready",
    name: "Optimization Ready",
    description:
      "You're in a surprisingly strong position. The foundation is solid — now it's about building on it without burning out or losing direction.",
    focusAreas: [
      "Lock in the habits and patterns that are already working",
      "Stretch into growth areas with structured challenge",
      "Anticipate and prepare for common derailment triggers",
    ],
  },
  comfortable_plateau: {
    key: "comfortable_plateau",
    name: "Comfortable Plateau",
    description:
      "You've reached a stable place — but something tells you there's more. The challenge isn't survival anymore; it's choosing growth when staying put feels easier.",
    focusAreas: [
      "Identify the area where comfort has become stagnation",
      "Reconnect with what excited you before things leveled off",
      "Take one small, intentional risk this week",
    ],
  },
  building_momentum: {
    key: "building_momentum",
    name: "Building Momentum",
    description:
      "You're moving in the right direction and the early signs are promising. The key now is consistency — protecting what's working while building on it.",
    focusAreas: [
      "Identify your current momentum drivers and protect them",
      "Build consistency systems before adding complexity",
      "Track progress visually to reinforce the pattern",
    ],
  },
};

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
          { name: "Emotional Recovery Toolkit", description: "Restore from the inside out" },
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
          { name: "Burnout Prevention & Recovery", description: "Protect your engine" },
          { name: "Stress Regulation", description: "Build sustainable capacity" },
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
          { name: "Strategic Focus System", description: "Sharpen your edge" },
          { name: "Leadership Under Pressure", description: "Lead with clarity" },
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
          { name: "Follow-Through Systems", description: "Lock in your progress" },
          { name: classification.name + " Path", description: "Sustain and grow" },
        ],
      };
    default:
      return base;
  }
}

function computePressureProfile(
  loadSignals: Record<string, string>,
  stateSignals: Record<string, string>,
  _behavioralPatterns: Record<string, string>
): string {
  return resolvePressureProfile(loadSignals, stateSignals);
}

function computeTradeoffStatement(
  stability: number,
  performance: number,
  alignment: number,
  pressureProfile: string
): string {
  if (stability < 3.0 && performance >= 3.5) {
    return "You're performing well on the outside, but your foundation is showing cracks. This is the pattern that leads to sudden breakdowns — not gradual ones.";
  }
  if (alignment < 3.0 && performance >= 3.5) {
    return "You're putting in serious effort, but it's pointed in the wrong direction. The exhaustion you feel isn't from working too hard — it's from working on the wrong things.";
  }
  if (stability < 3.0 && alignment < 3.0) {
    return "You're carrying too much with too little support, and what you're carrying doesn't even feel like yours. The first step isn't doing more — it's letting go of what isn't serving you.";
  }
  if (pressureProfile === "System Overload") {
    return "Your system is absorbing more than it can process. This isn't about willpower or motivation — it's about capacity. You need relief before you need a plan.";
  }
  if (stability >= 3.8 && performance >= 3.8 && alignment >= 3.8) {
    return "You're in a rare position of strength across all three dimensions. The opportunity now is to build on this momentum without overreaching.";
  }
  return "There's a gap between where you are and where you want to be — but it's narrower than it feels. Small, targeted adjustments will move the needle faster than a complete overhaul.";
}

function computeClassification(
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
): ResultsData {
  const stability = stabilityScores.stability_score ?? 3;
  const performance = performanceScores.performance_score ?? 3;
  const alignment = alignmentScores.alignment_score ?? 3;

  const pressureProfile = computePressureProfile(loadSignals, stateSignals, behavioralPatterns);
  const tradeoffStatement = computeTradeoffStatement(stability, performance, alignment, pressureProfile);
  const classification = computeClassification(stability, performance, alignment, pressureProfile);

  const traumaFlags = ["trauma_history", "trauma_informed"];
  const trauma_informed_mode = healthFlags.selected_flags.some(f => traumaFlags.includes(f));

  const moduleMap: Record<string, { name: string; days: number }> = {
    "Capacity Erosion": { name: "Foundation Reset", days: 1 },
    "Performance Stagnation": { name: "Clarity Sprint", days: 1 },
    "Alignment Fracture": { name: "Values Deep-Dive", days: 2 },
    "High Output / Hidden Instability": { name: "The Inner Audit", days: 1 },
    "Optimization Ready": { name: "Momentum Design", days: 2 },
    "Comfortable Plateau": { name: "Direction Check", days: 2 },
    "Building Momentum": { name: "Consistency Lock", days: 1 },
  };

  const mod = moduleMap[classification.name] ?? { name: "Foundation Reset", days: 1 };

  return {
    stability_score: stability,
    performance_score: performance,
    alignment_score: alignment,
    orientation_score: orientationScore,
    pressure_profile: pressureProfile,
    tradeoff_statement: tradeoffStatement,
    classification,
    recovery_mode_active: healthFlags.recovery_mode_active,
    grief_mode_active: healthFlags.grief_mode_active,
    trauma_informed_mode,
    first_module: mod.name,
    module_days: mod.days,
  };
}
