import { writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

import { emitAllPhase6Scaffolds } from "../../m2/emitters/index.js";
import { buildM2Views } from "../../m2/views/index.js";
import { ensureDir } from "../../utils/index.js";
import type { CommandContext } from "../registry.js";
import { loadInventoryFromTarget, loadRefsFromTarget, resolvePhase6TargetDir } from "./phase6-common.js";

interface Phase6MaterializeArgs {
  target: string;
  outDir: string | null;
  dryRun: boolean;
  json: boolean;
  strictChecks: boolean;
}

function parseArgs(args: string[]): Phase6MaterializeArgs {
  const outIndex = args.findIndex((arg) => arg === "--out");
  const outDir =
    outIndex >= 0 && args[outIndex + 1] !== undefined && !args[outIndex + 1]?.startsWith("-")
      ? args[outIndex + 1] ?? null
      : null;
  let appId: string | null = null;
  const consumed = new Set<number>(outDir === null ? [] : [outIndex, outIndex + 1]);
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--app-id") {
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("-")) {
      throw new Error(
        "Usage: b2c phase6:materialize <path-or-app> [--app-id <id>] [--out <dir>] [--dry-run] [--json] [--strict]",
      );
    }
    appId = value;
    consumed.add(index);
    consumed.add(index + 1);
    index += 1;
  }
  const positional = args.find((arg, index) => !arg.startsWith("-") && !consumed.has(index));
  if (appId && positional) {
    throw new Error("Conflicting selectors: choose either positional <path-or-app> or --app-id.");
  }
  const target = appId ? `apps/${appId}` : positional;
  if (!target) {
    throw new Error(
      "Usage: b2c phase6:materialize <path-or-app> [--app-id <id>] [--out <dir>] [--dry-run] [--json] [--strict]",
    );
  }
  return {
    target,
    outDir,
    dryRun: args.includes("--dry-run"),
    json: args.includes("--json"),
    strictChecks: args.includes("--strict"),
  };
}

export async function runPhase6MaterializeCommand(context: CommandContext): Promise<void> {
  const parsed = parseArgs(context.args);
  const targetDir = await resolvePhase6TargetDir(context.workspaceRoot, parsed.target);
  const [inventory, refs] = await Promise.all([loadInventoryFromTarget(targetDir), loadRefsFromTarget(targetDir)]);
  const views = buildM2Views(inventory);
  const emitted = emitAllPhase6Scaffolds(inventory, views, refs);
  const defaultPhase6Dir = join(targetDir, "phase6");
  const outDir = parsed.outDir ? resolve(parsed.outDir) : defaultPhase6Dir;
  const writeAgentAlias = outDir === defaultPhase6Dir;

  if (parsed.strictChecks) {
    const failedChecks = emitted.checks.filter((check) => !check.pass);
    if (failedChecks.length > 0) {
      const details = failedChecks.map((check) => `${check.name}: ${check.detail}`).join("\n");
      throw new Error(`phase6:materialize strict checks failed:\n${details}`);
    }
  }

  if (!parsed.dryRun) {
    for (const artifact of emitted.artifacts) {
      const destination = join(outDir, artifact.path);
      await ensureDir(dirname(destination));
      await writeFile(destination, artifact.content, "utf8");
      if (writeAgentAlias && artifact.path.startsWith("agent/")) {
        const aliasDestination = join(targetDir, artifact.path);
        await ensureDir(dirname(aliasDestination));
        await writeFile(aliasDestination, artifact.content, "utf8");
      }
    }
  }

  const result = {
    ok: emitted.checks.every((check) => check.pass),
    command: "phase6:materialize",
    target: targetDir,
    out_dir: outDir,
    dry_run: parsed.dryRun,
    strict: parsed.strictChecks,
    agent_alias_written: writeAgentAlias && !parsed.dryRun,
    artifact_count: emitted.artifacts.length,
    checks: emitted.checks,
    files: emitted.artifacts.map((artifact) => artifact.path),
  };
  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const aliasNote =
    writeAgentAlias && !parsed.dryRun
      ? ` (and mirrored agent artifacts to ${join(targetDir, "agent")})`
      : "";
  process.stdout.write(
    `phase6:materialize ${parsed.dryRun ? "planned" : "wrote"} ${emitted.artifacts.length} artifact(s) to ${outDir}${aliasNote}.\n`,
  );
}
