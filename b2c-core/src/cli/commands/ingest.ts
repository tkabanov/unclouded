import { basename, join, resolve } from "node:path";
import process from "node:process";

import { runIngest } from "../../ingest.js";
import { resolveOutputRoot } from "../output-root-resolver.js";
import type { CommandContext } from "../registry.js";

function normalizeInputPath(workspaceRoot: string, rawArg: string): string {
  const absoluteIfExists = resolve(rawArg);
  if (rawArg.endsWith(".bubble")) {
    return absoluteIfExists;
  }
  return join(workspaceRoot, "bubble-apps-metadata-examples", `${rawArg}.bubble`);
}

export async function runIngestCommand(context: CommandContext): Promise<void> {
  const rootResolution = await resolveOutputRoot(context.workspaceRoot, context.args);
  const inputArg = rootResolution.args[0];
  if (!inputArg) {
    throw new Error(
      "Usage: b2c ingest <path-to-bubble-or-app-name> [--app-id <id> | --output-root <path> | --legacy-root]",
    );
  }
  const inputPath = normalizeInputPath(context.workspaceRoot, inputArg);
  const appName = basename(inputPath, ".bubble");
  const outputs = await runIngest(inputPath, rootResolution.outputRoot);
  const classCounts = outputs.inventory.entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.entity_class] = (acc[entry.entity_class] ?? 0) + 1;
    return acc;
  }, {});
  classCounts.data_binding = outputs.inventory.entries.filter(
    (entry) => entry.meta?.data_binding !== undefined,
  ).length;
  classCounts.text_expression = outputs.inventory.entries.reduce((sum, entry) => {
    const fragments = entry.meta?.text_expressions;
    return sum + (Array.isArray(fragments) ? fragments.length : 0);
  }, 0);
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        app: appName,
        source_sha256: outputs.source_sha256,
        inventory_count: outputs.inventory.entries.length,
        refs_count: outputs.refs.length,
        slices_count: outputs.slices.length,
        class_counts: classCounts,
      },
      null,
      2,
    ) + "\n",
  );
}
