import { join, resolve } from "node:path";

import { writeJsonFile } from "../utils/index.js";

const RESOLUTION_SCHEMA_VERSION = "b2c.output-root-resolution.v1";

export type ResolutionSource = "legacy" | "app" | "explicit";

export interface OutputRootResolution {
  outputRoot: string;
  resolutionSource: ResolutionSource;
  schemaVersion: typeof RESOLUTION_SCHEMA_VERSION;
  args: string[];
}

interface RootSelectors {
  appId: string | null;
  explicitRoot: string | null;
  legacyRoot: boolean;
  remainingArgs: string[];
}

function parseRootSelectors(args: string[]): RootSelectors {
  let appId: string | null = null;
  let explicitRoot: string | null = null;
  let legacyRoot = false;
  const remainingArgs: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) {
      continue;
    }
    if (arg === "--app-id") {
      const next = args[index + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("Missing value for --app-id. Usage: --app-id <id>");
      }
      if (appId !== null) {
        throw new Error("Duplicate --app-id selector.");
      }
      appId = next;
      index += 1;
      continue;
    }
    if (arg === "--output-root") {
      const next = args[index + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("Missing value for --output-root. Usage: --output-root <path>");
      }
      if (explicitRoot !== null) {
        throw new Error("Duplicate --output-root selector.");
      }
      explicitRoot = next;
      index += 1;
      continue;
    }
    if (arg === "--legacy-root") {
      if (legacyRoot) {
        throw new Error("Duplicate --legacy-root selector.");
      }
      legacyRoot = true;
      continue;
    }
    remainingArgs.push(arg);
  }
  if (appId && explicitRoot) {
    throw new Error("Conflicting selectors: --app-id cannot be combined with --output-root.");
  }
  if (legacyRoot && (appId || explicitRoot)) {
    throw new Error("Conflicting selectors: --legacy-root cannot be combined with --app-id or --output-root.");
  }
  if (appId && !/^[A-Za-z0-9._-]+$/.test(appId)) {
    throw new Error(
      `Invalid --app-id "${appId}". Allowed pattern: [A-Za-z0-9._-]+`,
    );
  }
  return {
    appId,
    explicitRoot,
    legacyRoot,
    remainingArgs,
  };
}

export async function resolveOutputRoot(workspaceRoot: string, args: string[]): Promise<OutputRootResolution> {
  const selectors = parseRootSelectors(args);
  if (selectors.explicitRoot === null && selectors.appId === null && !selectors.legacyRoot) {
    throw new Error(
      "Output root selector is required. Use --app-id <id> for project-scoped artifacts, --output-root <path> for explicit root, or --legacy-root to force output/.",
    );
  }
  const explicitRootAbsolute =
    selectors.explicitRoot !== null ? resolve(workspaceRoot, selectors.explicitRoot) : null;
  const outputRoot =
    explicitRootAbsolute !== null
      ? explicitRootAbsolute
      : selectors.appId !== null
        ? join(workspaceRoot, "output", selectors.appId)
        : join(workspaceRoot, "output");
  const resolutionSource: ResolutionSource =
    selectors.explicitRoot !== null ? "explicit" : selectors.appId !== null ? "app" : "legacy";
  await writeJsonFile(join(outputRoot, "state", "resolution.json"), {
    schema: RESOLUTION_SCHEMA_VERSION,
    schema_version: 1,
    workspace_root: workspaceRoot,
    output_root: outputRoot,
    resolution_source: resolutionSource,
    selectors: {
      app_id: selectors.appId,
      explicit_root: explicitRootAbsolute,
      legacy_root: selectors.legacyRoot,
    },
  });
  return {
    outputRoot,
    resolutionSource,
    schemaVersion: RESOLUTION_SCHEMA_VERSION,
    args: selectors.remainingArgs,
  };
}
