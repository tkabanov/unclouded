import { supabase } from "@/integrations/supabase/client";
import { resolvePromptTestChatTarget } from "@/lib/admin/promptTestChatConfig";

export type PromptTestRunResult = {
  scenarioId: string;
  title: string;
  expectedBehavior: string;
  response: string;
  flagged: boolean;
  flags: string[];
  crisisHardStop: boolean;
};

async function getAuthToken(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return token;
}

export async function runPromptTestScenario(
  scenarioId: string,
  promptLibraryVersionId?: string,
): Promise<PromptTestRunResult> {
  const target = resolvePromptTestChatTarget();
  const token = await getAuthToken();

  const response = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: target.publishableKey,
      Authorization: `Bearer ${token}`,
      ...(promptLibraryVersionId ? { "x-prompt-library-slot": "draft" } : {}),
    },
    body: JSON.stringify({
      lifecycle: "prompt_test",
      promptTestScenarioId: scenarioId,
      promptLibraryVersionId,
      messages: [],
    }),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      typeof payload.error === "string" && payload.error.trim()
        ? payload.error.trim()
        : `Prompt test failed (${response.status})`;
    throw new Error(message);
  }

  return {
    scenarioId: String(payload.scenarioId ?? scenarioId),
    title: String(payload.title ?? scenarioId),
    expectedBehavior: String(payload.expectedBehavior ?? ""),
    response: String(payload.response ?? ""),
    flagged: payload.flagged === true,
    flags: Array.isArray(payload.flags)
      ? payload.flags.filter((flag): flag is string => typeof flag === "string")
      : [],
    crisisHardStop: payload.crisisHardStop === true,
  };
}

export async function runAllPromptTestScenarios(
  scenarioIds: string[],
  onProgress?: (scenarioId: string, index: number, total: number) => void,
  promptLibraryVersionId?: string,
): Promise<PromptTestRunResult[]> {
  const results: PromptTestRunResult[] = [];

  for (let index = 0; index < scenarioIds.length; index += 1) {
    const scenarioId = scenarioIds[index];
    onProgress?.(scenarioId, index, scenarioIds.length);
    results.push(await runPromptTestScenario(scenarioId, promptLibraryVersionId));
  }

  return results;
}
