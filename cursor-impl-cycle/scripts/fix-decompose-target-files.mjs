#!/usr/bin/env node
/**
 * Rewrite decompose target_files to React prototype directory layout:
 * pages/, components/, lib/, hooks/ — never features/, composables/, domain/, api/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectConfig, resolvePaths } from "../lib/paths.mjs";
import { resolveWorkspaceRoot } from "../lib/workspace.mjs";

const PACK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadConventions(packRoot, workspaceRoot) {
  const project = loadProjectConfig(packRoot);
  const paths = resolvePaths(workspaceRoot, project, packRoot);
  return JSON.parse(fs.readFileSync(paths.pathConventionsPath, "utf8"));
}

function isHookFile(basename) {
  return /^use[A-Z]/.test(basename);
}

function isLibFile(basename) {
  return (
    /Api\.ts$/.test(basename) ||
    /Store\.ts$/.test(basename) ||
    /Stub\.ts$/.test(basename) ||
    /Registry\.ts$/.test(basename) ||
    /Pipeline\.ts$/.test(basename) ||
    /tokens\.css$/.test(basename) ||
    /styles\.css$/.test(basename) ||
    (/\.ts$/.test(basename) && !basename.endsWith(".tsx") && !isHookFile(basename))
  );
}

function rewriteFeaturesPath(file, conventions) {
  const m = file.match(/^frontend\/src\/features\/([^/]+)\/(.+)$/);
  if (!m) return file;

  const [, area, rest] = m;
  const basename = path.basename(rest);
  const stem = basename.replace(/\.(tsx|ts)$/, "");

  const pageKey = `${area}/${stem}`;
  if (conventions.page_content_map?.[pageKey]) {
    return `frontend/src/${conventions.page_content_map[pageKey]}`;
  }

  if (rest.startsWith("components/")) {
    const sub = rest.slice("components/".length);
    return `frontend/src/components/${area}/${sub}`;
  }

  if (area === "settings" && rest.startsWith("admin/")) {
    return `frontend/src/components/settings/${rest}`;
  }

  if (isHookFile(basename)) {
    return `frontend/src/hooks/${basename}`;
  }

  if (isLibFile(basename)) {
    return `frontend/src/lib/${area}/${basename}`;
  }

  if (basename.endsWith(".tsx")) {
    return `frontend/src/components/${area}/${basename}`;
  }

  return `frontend/src/lib/${area}/${basename}`;
}

function rewriteTargetFile(file, conventions) {
  let f = file.replace(/\.vue$/, ".tsx");

  const routerRewrites = [
    ["frontend/src/router/index.ts", conventions.paths.routes],
    ["frontend/src/router/guards/requireAuth.ts", conventions.paths.auth_guard],
    ["frontend/src/router/authenticatedRoutes.ts", conventions.paths.routes],
  ];
  for (const [from, to] of routerRewrites) {
    if (f === from) return to;
  }

  if (/\/features\/[^/]+\/routes\.ts$/.test(f)) {
    return conventions.paths.routes;
  }

  if (conventions.prototype_component_map[f]) {
    return conventions.prototype_component_map[f];
  }

  f = f.replace(/^frontend\/src\/composables\//, "frontend/src/hooks/");
  f = f.replace(/^frontend\/src\/domain\/enums\//, "frontend/src/lib/enums/");
  f = f.replace(/^frontend\/src\/api\/userProfile\//, "frontend/src/lib/userProfile/");

  if (f.startsWith("frontend/src/features/")) {
    f = rewriteFeaturesPath(f, conventions);
  }

  if (conventions.prototype_component_map[f]) {
    f = conventions.prototype_component_map[f];
  }

  const base = path.basename(f, path.extname(f));
  const pageName = conventions.page_name_map[base];
  if (pageName) {
    f = f.replace(`${base}${path.extname(f)}`, `${pageName}${path.extname(f)}`);
  }

  return f;
}

function dedupe(files) {
  return [...new Set(files)];
}

function sortPaths(files) {
  const order = (f) => {
    if (f.includes("/pages/")) return 0;
    if (f.endsWith("/App.tsx")) return 1;
    if (f.includes("/components/")) return 2;
    if (f.includes("/hooks/")) return 3;
    if (f.includes("/lib/")) return 4;
    if (f.includes("/styles/")) return 5;
    return 6;
  };
  return [...files].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
}

function main() {
  const workspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
  const project = loadProjectConfig(PACK_ROOT);
  const paths = resolvePaths(workspaceRoot, project, PACK_ROOT);
  const conventions = loadConventions(PACK_ROOT, workspaceRoot);
  const decomposeDir = paths.decomposeDir;

  let itemCount = 0;

  for (const name of fs.readdirSync(decomposeDir)) {
    if (!name.endsWith(".json")) continue;
    const filePath = path.join(decomposeDir, name);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    let changed = false;

    for (const item of data.items ?? []) {
      if (!item.target_files?.length) continue;
      const rewritten = sortPaths(dedupe(item.target_files.map((f) => rewriteTargetFile(f, conventions))));
      if (JSON.stringify(rewritten) !== JSON.stringify(item.target_files)) {
        item.target_files = rewritten;
        changed = true;
        itemCount += 1;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
      console.log(`Updated ${name}`);
    }
  }

  console.log(`Done: ${itemCount} items updated across decompose/*.json`);
}

main();
