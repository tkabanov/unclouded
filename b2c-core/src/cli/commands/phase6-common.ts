import { resolve, join } from "node:path";
import { stat } from "node:fs/promises";

import type { InventoryFile, LintFile, RefEdge } from "../../types.js";
import { readTextFile } from "../../utils/index.js";

async function isDirectory(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch {
    return false;
  }
}

async function hasInventory(path: string): Promise<boolean> {
  const inventoryPath = join(path, "index", "inventory.json");
  try {
    const info = await stat(inventoryPath);
    return info.isFile();
  } catch {
    return false;
  }
}

export async function resolvePhase6TargetDir(workspaceRoot: string, target: string): Promise<string> {
  const direct = resolve(target);
  const underWorkspaceB2c = join(workspaceRoot, "b2c", target);
  const underWorkspaceApps = join(workspaceRoot, "b2c", "apps", target);
  const candidates = [direct, underWorkspaceB2c, underWorkspaceApps];
  const matches: string[] = [];
  for (const candidate of candidates) {
    if ((await isDirectory(candidate)) && (await hasInventory(candidate))) {
      matches.push(candidate);
    }
  }
  const uniqueMatches = [...new Set(matches)];
  if (uniqueMatches.length === 1) {
    return uniqueMatches[0] ?? direct;
  }
  if (uniqueMatches.length > 1) {
    throw new Error(
      `Ambiguous phase6 target "${target}". Matched multiple directories with index/inventory.json: ${uniqueMatches.join(", ")}. Use an explicit path to disambiguate.`,
    );
  }
  throw new Error(
    `Could not resolve phase6 target "${target}". Expected directory with index/inventory.json (direct path, under ${join(workspaceRoot, "b2c")}, or under ${join(workspaceRoot, "b2c", "apps")}).`,
  );
}

export async function loadInventoryFromTarget(targetDir: string): Promise<InventoryFile> {
  const inventoryPath = join(targetDir, "index", "inventory.json");
  const text = await readTextFile(inventoryPath);
  return JSON.parse(text) as InventoryFile;
}

export async function loadRefsFromTarget(targetDir: string): Promise<RefEdge[]> {
  const refsPath = join(targetDir, "index", "refs.json");
  const text = await readTextFile(refsPath);
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid refs.json format at ${refsPath}: expected array`);
  }
  return parsed as RefEdge[];
}

export async function loadLintFromTarget(targetDir: string): Promise<LintFile> {
  const lintPath = join(targetDir, "state", "lint.json");
  const text = await readTextFile(lintPath);
  const parsed = JSON.parse(text) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid lint.json format at ${lintPath}: expected object`);
  }
  const lint = parsed as Partial<LintFile>;
  if (lint.status !== "pass" && lint.status !== "fail") {
    throw new Error(`Invalid lint.json format at ${lintPath}: expected status=pass|fail`);
  }
  if (!Array.isArray(lint.suspicious_public_integration_keys)) {
    throw new Error(`Invalid lint.json format at ${lintPath}: expected suspicious_public_integration_keys array`);
  }
  return lint as LintFile;
}
