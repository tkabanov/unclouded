#!/usr/bin/env node
import { rebuildItemRegistry } from "../lib/item-registry.mjs";
import { loadProjectConfig, PACK_ROOT, resolvePaths, resolveWorkspaceRoot } from "../lib/paths.mjs";

const workspaceRoot = resolveWorkspaceRoot(PACK_ROOT);
const project = loadProjectConfig();
const paths = resolvePaths(workspaceRoot, project);
const registry = rebuildItemRegistry(paths);
const itemCount = Object.keys(registry.items).length;
const modCount = Object.keys(registry.modules).length;
console.log(`OK item-registry: ${paths.itemRegistryPath} (${modCount} modules, ${itemCount} items)`);
