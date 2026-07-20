import type { UIMessage } from "npm:ai";
import type { ProfileData } from "../prompt/types.ts";
import type { ChatLifecycleMode } from "../prompt/sessionLifecycle.ts";
import { CHAT_SESSION_MEMORY_KEY } from "../sessionMemory/sessionMemoryHelpers.ts";
import type { PromptTestProfileFixture, PromptTestScenarioDefinition } from "./scenarios.ts";

const CLASSIFICATION_NAMES: Record<string, string> = {
  capacity_erosion: "Capacity Erosion",
  high_output_hidden_instability: "High Output / Hidden Instability",
  alignment_fracture: "Alignment Fracture",
  performance_stagnation: "Performance Stagnation",
  comfortable_plateau: "Comfortable Plateau",
  building_momentum: "Building Momentum",
  optimization_ready: "Optimization Ready",
};

function classificationForKey(key: string) {
  return {
    key,
    name: CLASSIFICATION_NAMES[key] ?? key,
    description: "Prompt test fixture classification.",
    focusAreas: ["Prompt test fixture"],
  };
}

export function buildPromptTestProfile(scenario: PromptTestScenarioDefinition): ProfileData {
  const fixture = scenario.profile;
  const classificationKey = fixture.classificationKey ?? "building_momentum";
  const stability = fixture.stabilityScore ?? 3.5;
  const performance = fixture.performanceScore ?? 3.5;
  const alignment = fixture.alignmentScore ?? 3.5;

  const onboardingData: Record<string, unknown> = {
    session_count_number: fixture.sessionCount ?? 3,
    loadSignals: {
      cognitive_load_signal: "moderate",
      relational_load_signal: "moderate",
      environmental_load_signal: "moderate",
      financial_load_signal: "moderate",
    },
    stateSignals: {
      nervous_system_state: stability < 2.5 ? "depleted" : "regulated",
      energy_level: stability < 3 ? "low" : "steady",
    },
  };

  if (fixture.sessionMemory?.length) {
    onboardingData[CHAT_SESSION_MEMORY_KEY] = fixture.sessionMemory;
  }

  return {
    firstName: "Alex",
    roleType: "professional",
    primaryPillar: "stability",
    tier: "pro",
    subscribed: true,
    results: {
      stability_score: stability,
      performance_score: performance,
      alignment_score: alignment,
      orientation_score: 3.5,
      pressure_profile: "Prompt test fixture",
      tradeoff_statement: "Prompt test fixture tradeoff.",
      classification: classificationForKey(classificationKey),
      recovery_mode_active: fixture.recoveryMode === true,
      grief_mode_active: fixture.griefMode === true,
      trauma_informed_mode: false,
      first_module: "Hard Seasons",
      module_days: 42,
    },
    onboardingData,
    liveContext: {
      sessionCount: fixture.sessionCount ?? 3,
      sessionType: scenario.sessionType ?? fixture.sessionType ?? "text",
      daysSinceLastSession: fixture.daysSinceLastSession ?? null,
      hasPriorCrisisSession: fixture.hasPriorCrisisSession ?? null,
      significantPulseDrop: fixture.significantPulseDrop ?? null,
      significantLifeEventFlag: fixture.significantLifeEventFlag ?? null,
      memoryFactsBlock: fixture.memoryFactsBlock ?? null,
      exchangeCount: 1,
    },
  };
}

export function buildPromptTestMessages(scenario: PromptTestScenarioDefinition): UIMessage[] {
  const messages: UIMessage[] = [];

  for (const prior of scenario.priorMessages ?? []) {
    messages.push({
      id: `prior-${messages.length}`,
      role: prior.role,
      parts: [{ type: "text", text: prior.text }],
    });
  }

  if (scenario.lifecycle === "session_open" && messages.length === 0) {
    messages.push({
      id: "session-open",
      role: "user",
      parts: [{ type: "text", text: "[SESSION START]" }],
    });
    return messages;
  }

  if (scenario.userMessage?.trim()) {
    messages.push({
      id: `user-${messages.length}`,
      role: "user",
      parts: [{ type: "text", text: scenario.userMessage.trim() }],
    });
  }

  if (scenario.lifecycle === "session_close" && messages.length > 0) {
    return messages;
  }

  return messages;
}

export function resolvePromptTestLifecycle(
  scenario: PromptTestScenarioDefinition,
): ChatLifecycleMode | undefined {
  if (scenario.lifecycle === "session_open" || scenario.lifecycle === "session_close") {
    return scenario.lifecycle;
  }
  return undefined;
}

export type PromptTestRunPayload = {
  scenarioId: string;
  title: string;
  expectedBehavior: string;
  response: string;
  flagged: boolean;
  flags: string[];
  crisisHardStop: boolean;
};
