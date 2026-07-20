export type {
  PromptTestChecks,
  PromptTestProfileFixture,
  PromptTestScenarioDefinition,
} from "../../../../supabase/functions/chat/promptTest/scenarios.ts";
export {
  getPromptTestScenario,
  PROMPT_TEST_SCENARIOS,
} from "../../../../supabase/functions/chat/promptTest/scenarios.ts";

/** @deprecated Use PromptTestScenarioDefinition */
export type PromptTestScenario = {
  id: string;
  title: string;
  expectedBehavior: string;
};
