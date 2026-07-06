import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { resolveOutputRoot } from "./output-root-resolver.js";

async function withTempWorkspace(run: (workspaceRoot: string) => Promise<void>): Promise<void> {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "b2c-output-root-"));
  try {
    await run(workspaceRoot);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}

test("resolver precedence: explicit root wins over defaults", async () => {
  await withTempWorkspace(async (workspaceRoot) => {
    const resolution = await resolveOutputRoot(workspaceRoot, ["--output-root", "./custom-out"]);
    assert.equal(resolution.resolutionSource, "explicit");
    assert.equal(resolution.outputRoot, join(workspaceRoot, "custom-out"));
    assert.deepEqual(resolution.args, []);
  });
});

test("resolver precedence: app selector uses app-scoped root", async () => {
  await withTempWorkspace(async (workspaceRoot) => {
    const resolution = await resolveOutputRoot(workspaceRoot, ["--app-id", "teamapp-75292"]);
    assert.equal(resolution.resolutionSource, "app");
    assert.equal(resolution.outputRoot, join(workspaceRoot, "output", "teamapp-75292"));
    assert.deepEqual(resolution.args, []);
  });
});

test("resolver requires explicit selector and rejects implicit legacy default", async () => {
  await withTempWorkspace(async (workspaceRoot) => {
    await assert.rejects(
      resolveOutputRoot(workspaceRoot, ["--json"]),
      /Output root selector is required/,
    );
  });
});

test("resolver rejects conflicting selector combinations", async () => {
  await withTempWorkspace(async (workspaceRoot) => {
    await assert.rejects(
      resolveOutputRoot(workspaceRoot, ["--app-id", "smartqms-33414", "--output-root", "/tmp/x"]),
      /Conflicting selectors/,
    );
    await assert.rejects(
      resolveOutputRoot(workspaceRoot, ["--legacy-root", "--app-id", "smartqms-33414"]),
      /Conflicting selectors/,
    );
  });
});

test("resolution.json emission is deterministic", async () => {
  await withTempWorkspace(async (workspaceRoot) => {
    const args = ["--app-id", "barrow-no-temp"];
    const first = await resolveOutputRoot(workspaceRoot, args);
    const firstJsonPath = join(first.outputRoot, "state", "resolution.json");
    const firstJson = await readFile(firstJsonPath, "utf8");
    const second = await resolveOutputRoot(workspaceRoot, args);
    const secondJsonPath = join(second.outputRoot, "state", "resolution.json");
    const secondJson = await readFile(secondJsonPath, "utf8");
    assert.equal(firstJson, secondJson);
  });
});
