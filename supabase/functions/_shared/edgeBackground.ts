type EdgeRuntimeGlobal = {
  waitUntil: (promise: Promise<unknown>) => void;
};

function getEdgeRuntime(): EdgeRuntimeGlobal | null {
  const runtime = (globalThis as { EdgeRuntime?: EdgeRuntimeGlobal }).EdgeRuntime;
  if (runtime && typeof runtime.waitUntil === "function") {
    return runtime;
  }
  return null;
}

/**
 * REQ-01: schedule post-response work so the edge worker stays alive until upsert completes.
 * Supabase: https://supabase.com/docs/guides/functions/background-tasks
 */
export function scheduleEdgeBackgroundWork(work: Promise<unknown>): void {
  const edgeRuntime = getEdgeRuntime();
  if (edgeRuntime) {
    edgeRuntime.waitUntil(work);
    return;
  }

  // Vitest / non-edge environments — best-effort; production always has EdgeRuntime.
  void work.catch((err) => {
    console.warn("edge background work failed", err);
  });
}

export function __testOnlyResetEdgeRuntime(): void {
  delete (globalThis as { EdgeRuntime?: EdgeRuntimeGlobal }).EdgeRuntime;
}

export function __testOnlySetEdgeRuntime(runtime: EdgeRuntimeGlobal | undefined): void {
  if (runtime) {
    (globalThis as { EdgeRuntime?: EdgeRuntimeGlobal }).EdgeRuntime = runtime;
  } else {
    __testOnlyResetEdgeRuntime();
  }
}
