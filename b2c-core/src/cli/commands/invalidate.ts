import { join } from "node:path";
import process from "node:process";

import { buildM2Views } from "../../m2/views/index.js";
import { buildDepgraphDoc } from "../../m2/emitters/depgraph.js";
import { writeJsonFile } from "../../utils/index.js";
import type { CommandContext } from "../registry.js";
import { loadInventoryFromTarget, loadRefsFromTarget, resolvePhase6TargetDir } from "./phase6-common.js";

interface InvalidateArgs {
  id: string;
  target: string;
  json: boolean;
}

function parseArgs(args: string[]): InvalidateArgs {
  let target: string | null = null;
  let appId: string | null = null;
  const consumed = new Set<number>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--target") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("Usage: b2c invalidate <id> [--target <path-or-app>] [--app-id <id>] [--json]");
      }
      target = value;
      consumed.add(index);
      consumed.add(index + 1);
      index += 1;
      continue;
    }
    if (arg === "--app-id") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("Usage: b2c invalidate <id> [--target <path-or-app>] [--app-id <id>] [--json]");
      }
      appId = value;
      consumed.add(index);
      consumed.add(index + 1);
      index += 1;
      continue;
    }
  }
  if (target && appId) {
    throw new Error("Conflicting selectors: choose either --target or --app-id for invalidate.");
  }
  const id = args.find((arg, index) => !arg.startsWith("-") && !consumed.has(index));
  if (!id) {
    throw new Error("Usage: b2c invalidate <id> [--target <path-or-app>] [--app-id <id>] [--json]");
  }
  return {
    id,
    target: appId ? join("apps", appId) : (target ?? "b2c"),
    json: args.includes("--json"),
  };
}

function impactedIds(seedId: string, depgraph: ReturnType<typeof buildDepgraphDoc>): string[] {
  const nodeIds = new Set(depgraph.nodes.map((node) => node.id));
  if (!nodeIds.has(seedId)) {
    return [];
  }
  const forward = new Map<string, Set<string>>();
  for (const edge of depgraph.edges) {
    const bucket = forward.get(edge.from_id) ?? new Set<string>();
    bucket.add(edge.to_id);
    forward.set(edge.from_id, bucket);
  }
  const visited = new Set<string>([seedId]);
  const queue = [seedId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = forward.get(current);
    if (!children) {
      continue;
    }
    for (const child of children) {
      if (!nodeIds.has(child) || visited.has(child)) {
        continue;
      }
      visited.add(child);
      queue.push(child);
    }
  }
  return [...visited].sort((a, b) => a.localeCompare(b));
}

export async function runInvalidateCommand(context: CommandContext): Promise<void> {
  const parsed = parseArgs(context.args);
  const targetDir = await resolvePhase6TargetDir(context.workspaceRoot, parsed.target);
  const [inventory, refs] = await Promise.all([loadInventoryFromTarget(targetDir), loadRefsFromTarget(targetDir)]);
  const depgraph = buildDepgraphDoc(inventory, refs, buildM2Views(inventory));
  const impacted = impactedIds(parsed.id, depgraph);
  const output = {
    schema: "b2c.invalidate.v1",
    command: "invalidate",
    requested_id: parsed.id,
    target: targetDir,
    impacted_ids: impacted,
    impacted_count: impacted.length,
    generated_from: "depgraph",
  };
  await writeJsonFile(join(targetDir, "state", "invalidation.json"), output);
  if (parsed.json) {
    process.stdout.write(`${JSON.stringify({ ok: impacted.length > 0, ...output }, null, 2)}\n`);
    return;
  }
  if (impacted.length === 0) {
    process.stdout.write(`invalidate: id "${parsed.id}" not found in inventory for ${targetDir}.\n`);
    return;
  }
  process.stdout.write(`invalidate: marked ${impacted.length} id(s) from "${parsed.id}" under ${targetDir}/state.\n`);
}
