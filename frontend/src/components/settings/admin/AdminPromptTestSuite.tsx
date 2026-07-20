import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PROMPT_TEST_SCENARIOS } from "@/lib/admin/promptTestScenarios";
import {
  isPromptTestStagingConfigured,
  promptTestWouldHitProduction,
  resolvePromptTestChatTarget,
} from "@/lib/admin/promptTestChatConfig";
import {
  runAllPromptTestScenarios,
  runPromptTestScenario,
  type PromptTestRunResult,
} from "@/lib/admin/promptTestApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function AdminPromptTestSuite() {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [resultsById, setResultsById] = useState<Record<string, PromptTestRunResult>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const flaggedCount = useMemo(
    () => Object.values(resultsById).filter((result) => result.flagged).length,
    [resultsById],
  );

  const stagingConfigured = isPromptTestStagingConfigured();
  const stagingTarget = stagingConfigured ? resolvePromptTestChatTarget() : null;
  const testsBlocked = promptTestWouldHitProduction();

  const handleRun = useCallback(async (scenarioId: string) => {
    setRunningId(scenarioId);
    try {
      const result = await runPromptTestScenario(scenarioId);
      setResultsById((prev) => ({ ...prev, [scenarioId]: result }));
      setExpandedId(scenarioId);
      if (result.flagged) {
        toast.warning(`"${result.title}" flagged for review.`);
      } else {
        toast.success(`"${result.title}" passed heuristic checks.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Prompt test failed.");
    } finally {
      setRunningId(null);
    }
  }, []);

  const handleRunAll = useCallback(async () => {
    setRunningAll(true);
    try {
      const results = await runAllPromptTestScenarios(
        PROMPT_TEST_SCENARIOS.map((scenario) => scenario.id),
        (_scenarioId, index, total) => {
          toast.message(`Running prompt tests (${index + 1}/${total})…`);
        },
      );
      const next: Record<string, PromptTestRunResult> = {};
      for (const result of results) {
        next[result.scenarioId] = result;
      }
      setResultsById(next);
      const flagged = results.filter((result) => result.flagged).length;
      toast.message(`Finished ${results.length} prompt tests — ${flagged} flagged.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Prompt test batch failed.");
    } finally {
      setRunningAll(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(bubbleStyle("Group_card_muted_"), "flex gap-4 p-6")}>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FlaskConical className="h-5 w-5" />
        </span>
        <div className="space-y-2">
          <h3 className={bubbleStyle("Text_heading_3_")}>Prompt Test Suite</h3>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
            REQ-13 staging scenarios — runs Kota against fixture profiles on the staging draft chat
            edge. Review flagged responses with Dr. Sam before prompt library releases.
          </p>
          {stagingTarget ? (
            <p className="text-xs text-emerald-800 dark:text-emerald-200">
              Target: staging ({stagingTarget.displayHost} / {stagingTarget.functionName})
            </p>
          ) : (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Staging not configured — set VITE_PROMPT_TEST_SUPABASE_URL,
              VITE_PROMPT_TEST_SUPABASE_PUBLISHABLE_KEY, and VITE_PROMPT_TEST_CHAT_FUNCTION=chat-staging
              (see frontend/.env.development). Tests stay blocked so production chat is not used.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={testsBlocked || runningAll || runningId !== null}
              onClick={() => void handleRunAll()}
            >
              {runningAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running all…
                </>
              ) : (
                "Run all 30"
              )}
            </Button>
            {Object.keys(resultsById).length > 0 ? (
              <p className="self-center text-xs text-muted-foreground">
                {Object.keys(resultsById).length} run
                {Object.keys(resultsById).length === 1 ? "" : "s"} · {flaggedCount} flagged
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {PROMPT_TEST_SCENARIOS.map((scenario) => {
          const result = resultsById[scenario.id];
          const isExpanded = expandedId === scenario.id;
          const isRunning = runningId === scenario.id;

          return (
            <li
              key={scenario.id}
              className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-3 p-4")}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{scenario.title}</p>
                    {result ? (
                      result.flagged ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                          <AlertTriangle className="h-3 w-3" />
                          Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Pass
                        </span>
                      )
                    ) : null}
                  </div>
                  <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
                    Expected: {scenario.expectedBehavior}
                  </p>
                  <p className={cn(bubbleStyle("Text_body_muted_"), "text-xs")}>ID: {scenario.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={testsBlocked || isRunning || runningAll}
                    onClick={() => void handleRun(scenario.id)}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running…
                      </>
                    ) : (
                      "Run"
                    )}
                  </Button>
                  {result ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(isExpanded ? null : scenario.id)}
                    >
                      {isExpanded ? "Hide" : "View result"}
                    </Button>
                  ) : null}
                </div>
              </div>

              {result && isExpanded ? (
                <div className="space-y-3 border-t border-border pt-3 text-sm">
                  {result.crisisHardStop ? (
                    <p className="text-xs text-muted-foreground">Crisis hard-stop response</p>
                  ) : null}
                  <div>
                    <p className="mb-1 font-medium">Kota response</p>
                    <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                      {result.response || "—"}
                    </p>
                  </div>
                  {result.flags.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium text-amber-800 dark:text-amber-200">
                        Divergence flags
                      </p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                        {result.flags.map((flag) => (
                          <li key={flag}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No heuristic divergence flags for this scenario.
                    </p>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
