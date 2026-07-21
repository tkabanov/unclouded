import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  approvePromptLibraryVersion,
  createPromptLibraryDraft,
  listPromptLibraryVersions,
  promotePromptLibraryVersion,
  savePromptLibraryTestRun,
  updatePromptLibraryLayer,
  type PromptLibraryLayer,
  type PromptLibraryVersion,
} from "@/lib/admin/promptLibraryApi";
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
import { Textarea } from "@/components/ui/textarea";

export default function AdminPromptTestSuite() {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [resultsById, setResultsById] = useState<Record<string, PromptTestRunResult>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<PromptLibraryVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [layers, setLayers] = useState<PromptLibraryLayer[]>([]);
  const [selectedLayerKey, setSelectedLayerKey] = useState<string>("master_philosophy");
  const [layerDraft, setLayerDraft] = useState<string>("");
  const [lastTestRunId, setLastTestRunId] = useState<string | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryBusy, setLibraryBusy] = useState(false);

  const flaggedCount = useMemo(
    () => Object.values(resultsById).filter((result) => result.flagged).length,
    [resultsById],
  );

  const stagingConfigured = isPromptTestStagingConfigured();
  const stagingTarget = stagingConfigured ? resolvePromptTestChatTarget() : null;
  const testsBlocked = promptTestWouldHitProduction();
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? null;

  const loadLibrary = useCallback(async (versionId?: string) => {
    setLibraryLoading(true);
    try {
      const payload = await listPromptLibraryVersions(versionId);
      setVersions(payload.versions ?? []);
      const nextVersionId =
        versionId ??
        payload.versions?.find((version) => version.status === "draft")?.id ??
        payload.versions?.find((version) => version.status === "production")?.id ??
        "";
      setSelectedVersionId(nextVersionId);
      setLayers(payload.layers ?? []);
      const selectedLayer =
        payload.layers?.find((layer) => layer.layerKey === selectedLayerKey) ??
        payload.layers?.[0];
      if (selectedLayer) {
        setSelectedLayerKey(selectedLayer.layerKey);
        setLayerDraft(selectedLayer.content);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load prompt library.");
    } finally {
      setLibraryLoading(false);
    }
  }, [selectedLayerKey]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (!selectedVersionId) return;
    void loadLibrary(selectedVersionId);
  }, [selectedVersionId, loadLibrary]);

  const handleRun = useCallback(
    async (scenarioId: string) => {
      setRunningId(scenarioId);
      try {
        const result = await runPromptTestScenario(scenarioId, selectedVersionId || undefined);
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
    },
    [selectedVersionId],
  );

  const handleRunAll = useCallback(async () => {
    setRunningAll(true);
    try {
      const results = await runAllPromptTestScenarios(
        PROMPT_TEST_SCENARIOS.map((scenario) => scenario.id),
        (_scenarioId, index, total) => {
          toast.message(`Running prompt tests (${index + 1}/${total})…`);
        },
        selectedVersionId || undefined,
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
  }, [selectedVersionId]);

  const handleCreateDraft = useCallback(async () => {
    setLibraryBusy(true);
    try {
      const draft = await createPromptLibraryDraft();
      toast.success(`Draft created: ${draft.label}`);
      await loadLibrary(draft.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create draft.");
    } finally {
      setLibraryBusy(false);
    }
  }, [loadLibrary]);

  const handleSaveLayer = useCallback(async () => {
    if (!selectedVersionId || !selectedLayerKey) return;
    setLibraryBusy(true);
    try {
      await updatePromptLibraryLayer({
        versionId: selectedVersionId,
        layerKey: selectedLayerKey,
        content: layerDraft,
      });
      toast.success("Draft layer saved.");
      await loadLibrary(selectedVersionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save layer.");
    } finally {
      setLibraryBusy(false);
    }
  }, [layerDraft, loadLibrary, selectedLayerKey, selectedVersionId]);

  const handleSaveTestRun = useCallback(async () => {
    if (!selectedVersionId) return;
    setLibraryBusy(true);
    try {
      const testRun = await savePromptLibraryTestRun({
        versionId: selectedVersionId,
        resultsJson: Object.values(resultsById),
        flaggedCount,
      });
      setLastTestRunId(testRun.id);
      toast.success("Test run saved for approval.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save test run.");
    } finally {
      setLibraryBusy(false);
    }
  }, [flaggedCount, resultsById, selectedVersionId]);

  const handleApprove = useCallback(async () => {
    if (!selectedVersionId || !lastTestRunId) {
      toast.error("Save a test run before approving.");
      return;
    }
    setLibraryBusy(true);
    try {
      await approvePromptLibraryVersion({
        versionId: selectedVersionId,
        testRunId: lastTestRunId,
        overrideReason: flaggedCount > 0 ? "Reviewed flagged scenarios with Dr. Sam" : undefined,
      });
      toast.success("Draft approved.");
      await loadLibrary(selectedVersionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve draft.");
    } finally {
      setLibraryBusy(false);
    }
  }, [flaggedCount, lastTestRunId, loadLibrary, selectedVersionId]);

  const handlePromote = useCallback(async () => {
    if (!selectedVersionId) return;
    setLibraryBusy(true);
    try {
      await promotePromptLibraryVersion(selectedVersionId);
      toast.success("Prompt library promoted to production.");
      await loadLibrary(selectedVersionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote version.");
    } finally {
      setLibraryBusy(false);
    }
  }, [loadLibrary, selectedVersionId]);

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(bubbleStyle("Group_card_muted_"), "flex gap-4 p-6")}>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FlaskConical className="h-5 w-5" />
        </span>
        <div className="space-y-2">
          <h3 className={bubbleStyle("Text_heading_3_")}>Prompt Test Suite</h3>
          <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
            REQ-13 — DB-backed draft library, approval audit, and promote gate. Run scenarios against
            a selected draft version on the staging chat edge before production promotion.
          </p>
          {stagingTarget ? (
            <p className="text-xs text-emerald-800 dark:text-emerald-200">
              Target: staging ({stagingTarget.displayHost} / {stagingTarget.functionName})
            </p>
          ) : (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Staging not configured — set VITE_PROMPT_TEST_* env vars before running tests.
            </p>
          )}
        </div>
      </div>

      <div className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-4 p-4")}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-col gap-1 text-sm">
            <span className="font-medium">Library version</span>
            <select
              className="rounded-md border border-input bg-background px-3 py-2"
              value={selectedVersionId}
              disabled={libraryLoading || libraryBusy}
              onChange={(event) => setSelectedVersionId(event.target.value)}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label} ({version.status})
                </option>
              ))}
            </select>
          </label>
          <Button type="button" size="sm" variant="outline" disabled={libraryBusy} onClick={() => void handleCreateDraft()}>
            Create draft from production
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={libraryBusy || Object.keys(resultsById).length === 0 || !selectedVersionId}
            onClick={() => void handleSaveTestRun()}
          >
            Save test run
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={libraryBusy || !lastTestRunId || selectedVersion?.status === "production"}
            onClick={() => void handleApprove()}
          >
            Approve draft
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={libraryBusy || !selectedVersionId || selectedVersion?.status === "production"}
            onClick={() => void handlePromote()}
          >
            Promote to production
          </Button>
        </div>

        {selectedVersion?.status === "draft" ? (
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Layer</span>
              <select
                className="rounded-md border border-input bg-background px-3 py-2"
                value={selectedLayerKey}
                onChange={(event) => {
                  const nextKey = event.target.value;
                  setSelectedLayerKey(nextKey);
                  const nextLayer = layers.find((layer) => layer.layerKey === nextKey);
                  setLayerDraft(nextLayer?.content ?? "");
                }}
              >
                {layers.map((layer) => (
                  <option key={layer.layerKey} value={layer.layerKey}>
                    {layer.layerKey}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-2">
              <Textarea
                value={layerDraft}
                onChange={(event) => setLayerDraft(event.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
              <Button type="button" size="sm" variant="outline" disabled={libraryBusy} onClick={() => void handleSaveLayer()}>
                Save layer
              </Button>
            </div>
          </div>
        ) : null}
      </div>

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
