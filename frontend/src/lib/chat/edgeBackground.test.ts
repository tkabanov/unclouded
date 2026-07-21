import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __testOnlyResetEdgeRuntime,
  __testOnlySetEdgeRuntime,
  scheduleEdgeBackgroundWork,
} from "../../../../supabase/functions/_shared/edgeBackground.ts";

describe("scheduleEdgeBackgroundWork", () => {
  afterEach(() => {
    __testOnlyResetEdgeRuntime();
  });

  it("registers work with EdgeRuntime.waitUntil when available", async () => {
    const waitUntil = vi.fn();
    __testOnlySetEdgeRuntime({ waitUntil });

    let resolved = false;
    const work = new Promise<void>((resolve) => {
      queueMicrotask(() => {
        resolved = true;
        resolve();
      });
    });

    scheduleEdgeBackgroundWork(work);

    expect(waitUntil).toHaveBeenCalledOnce();
    expect(waitUntil.mock.calls[0][0]).toBe(work);
    await work;
    expect(resolved).toBe(true);
  });

  it("falls back to fire-and-forget when EdgeRuntime is unavailable", async () => {
    __testOnlyResetEdgeRuntime();

    let resolved = false;
    scheduleEdgeBackgroundWork(
      Promise.resolve().then(() => {
        resolved = true;
      }),
    );

    await Promise.resolve();
    expect(resolved).toBe(true);
  });
});
