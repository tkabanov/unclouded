import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { runM2Phase6AcceptanceScaffold } from "../../m2/acceptance/phase6.js";
import type { LintFile } from "../../types.js";
import type { CommandContext } from "../registry.js";
import { loadInventoryFromTarget, loadLintFromTarget, loadRefsFromTarget, resolvePhase6TargetDir } from "./phase6-common.js";

interface AcceptM2Args {
  target: string;
  json: boolean;
  failFast: boolean;
}

function parseArgs(args: string[]): AcceptM2Args {
  let fromFlag: string | null = null;
  let appId: string | null = null;
  const consumed = new Set<number>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--workspace" || arg === "--target") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("Usage: b2c accept:m2 <path-or-app> [--target <path-or-app>] [--app-id <id>] [--json] [--fail-fast]");
      }
      fromFlag = value;
      consumed.add(index);
      consumed.add(index + 1);
      index += 1;
      continue;
    }
    if (arg === "--app-id") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("Usage: b2c accept:m2 <path-or-app> [--target <path-or-app>] [--app-id <id>] [--json] [--fail-fast]");
      }
      appId = value;
      consumed.add(index);
      consumed.add(index + 1);
      index += 1;
    }
  }
  if (fromFlag && appId) {
    throw new Error("Conflicting selectors: choose either --target/--workspace or --app-id.");
  }
  const positional = args.find((arg, index) => !arg.startsWith("-") && !consumed.has(index));
  const target = appId ? `apps/${appId}` : (fromFlag ?? positional);
  if (!target) {
    throw new Error("Usage: b2c accept:m2 <path-or-app> [--target <path-or-app>] [--app-id <id>] [--json] [--fail-fast]");
  }
  return {
    target,
    json: args.includes("--json"),
    failFast: args.includes("--fail-fast"),
  };
}

export async function runAcceptM2Command(context: CommandContext): Promise<void> {
  const args = parseArgs(context.args);
  const targetDir = await resolvePhase6TargetDir(context.workspaceRoot, args.target);
  let lint: LintFile | null = null;
  let lintLoadError: string | null = null;
  const [inventory, refs] = await Promise.all([loadInventoryFromTarget(targetDir), loadRefsFromTarget(targetDir)]);
  try {
    lint = await loadLintFromTarget(targetDir);
  } catch (error) {
    lintLoadError = error instanceof Error ? error.message : String(error);
  }
  const acceptance = runM2Phase6AcceptanceScaffold(inventory, refs, { lint, lintLoadError });
  if (args.failFast) {
    const firstFailure = acceptance.checks.find((check) => !check.pass);
    if (firstFailure) {
      acceptance.checks = [firstFailure];
      acceptance.ok = false;
    }
  }
  const payload = {
    ok: acceptance.ok,
    command: "accept:m2",
    target: targetDir,
    fail_fast: args.failFast,
    checks: acceptance.checks,
  };
  const failedChecks = acceptance.checks.filter((check) => !check.pass);
  const diagnosticsPath = resolve(targetDir, "state", "accept-m2-report.json");
  const diagnosticsPayload = {
    ok: acceptance.ok,
    check_count: acceptance.checks.length,
    timestamp: new Date().toISOString(),
    failed_checks: failedChecks.map((check) => ({ name: check.name, detail: check.detail })),
    failed_check_names: failedChecks.map((check) => check.name),
    checks: acceptance.checks,
  };
  await mkdir(resolve(targetDir, "state"), { recursive: true });
  await writeFile(diagnosticsPath, `${JSON.stringify(diagnosticsPayload, null, 2)}\n`, "utf8");

  if (args.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  }
  if (!acceptance.ok) {
    const detail = failedChecks.map((check) => `- ${check.name}: ${check.detail}`).join("\n");
    throw new Error(`M2 acceptance failed:\n${detail}`);
  }
  if (!args.json) {
    process.stdout.write(`M2 acceptance passed (${acceptance.checks.length} checks).\n`);
  }
}
