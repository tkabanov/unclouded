import { join } from "node:path";

import { buildDeterministicCover } from "./cover/deterministic.js";
import { buildInventory } from "./inventory.js";
import { parseBubbleFile } from "./parse.js";
import { buildRefs } from "./refs.js";
import { buildResolver } from "./resolver.js";
import { buildSlices } from "./slicer.js";
import type {
  HeaderBudgetFile,
  IngestOutputs,
  InventoryBuildResult,
  InventoryFile,
} from "./types.js";
import {
  ensureDir,
  removeDirIfExists,
  writeJsonFile,
} from "./utils/index.js";
import {
  validateDeterministicSetEquality,
  validateIndexSubset,
  validateOAuthRefs,
  validateRefs,
} from "./validate.js";

export const DEFAULT_HEADER_BUDGET: HeaderBudgetFile = {
  ctx_budget: 80_000,
  header_budget: 24_000,
  response_budget: 8_000,
  slice_budget: 48_000,
};

function collectErrors(...lists: Array<{ errors: string[] }>): string[] {
  return lists.flatMap((item) => item.errors);
}

async function writeSlices(outputRoot: string, slices: IngestOutputs["slices"]): Promise<void> {
  const slicesDir = join(outputRoot, "index", "slices");
  await removeDirIfExists(slicesDir);
  await ensureDir(slicesDir);
  await writeJsonFile(join(slicesDir, "_all.json"), slices);
  for (const slice of slices) {
    const safeName = slice.slice_id.replaceAll("/", "__");
    await writeJsonFile(join(slicesDir, `${safeName}.json`), slice);
  }
}

export async function runIngest(
  inputPath: string,
  outputRoot: string,
): Promise<IngestOutputs> {
  const parsed = await parseBubbleFile(inputPath);
  const inventoryBuild: InventoryBuildResult = buildInventory(parsed.json);
  const inventory: InventoryFile = inventoryBuild.inventory;
  const lint = inventoryBuild.lint;

  await ensureDir(outputRoot);
  await ensureDir(join(outputRoot, "index"));
  await ensureDir(join(outputRoot, "drafts"));
  await ensureDir(join(outputRoot, "state"));
  await writeJsonFile(join(outputRoot, "state", "lint.json"), lint);
  if (lint.status === "fail") {
    const keys = lint.suspicious_public_integration_keys.map((issue) => issue.key).sort();
    throw new Error(
      `Ingest lint failed: ${keys.length} suspicious public integration key(s) matched denylist:\n${keys
        .map((key) => `- ${key}`)
        .join("\n")}`,
    );
  }

  const refs = buildRefs(parsed.json, inventory);
  const resolver = buildResolver(parsed.json, inventory);
  const slices = buildSlices(parsed.json, inventory);
  const deterministic = buildDeterministicCover(inventory);

  const validationErrors = collectErrors(
    validateIndexSubset(parsed.json, inventory),
    validateRefs(inventory, refs),
    validateOAuthRefs(parsed.json, refs),
    validateDeterministicSetEquality(inventory, deterministic.covered_ids),
  );
  if (validationErrors.length > 0) {
    throw new Error(`Ingest validation failed:\n${validationErrors.join("\n")}`);
  }

  await writeJsonFile(join(outputRoot, "index", "inventory.json"), inventory);
  await writeJsonFile(join(outputRoot, "index", "refs.json"), refs);
  await writeJsonFile(join(outputRoot, "index", "resolver.json"), resolver);
  await writeSlices(outputRoot, slices);
  await writeJsonFile(join(outputRoot, "drafts", "_deterministic.json"), deterministic);
  await writeJsonFile(join(outputRoot, "state", "source.sha256"), {
    source_path: parsed.sourcePath,
    sha256: parsed.sourceSha256,
  });
  await writeJsonFile(join(outputRoot, "state", "header_budget.json"), DEFAULT_HEADER_BUDGET);

  return {
    inventory,
    refs,
    resolver,
    slices,
    deterministic,
    source_sha256: parsed.sourceSha256,
    header_budget: DEFAULT_HEADER_BUDGET,
    lint,
  };
}
