import path from "node:path";

/**
 * Workspace root: one level up when pack lives at repo root,
 * two levels up when pack lives under cursor-packs/.
 */
export function resolveWorkspaceRoot(packRoot) {
  const parentDir = path.dirname(packRoot);
  if (path.basename(parentDir) === "cursor-packs") {
    return path.resolve(packRoot, "../..");
  }
  return path.resolve(packRoot, "..");
}

/** Pack path relative to workspace root, posix-style (for prompts and hooks). */
export function packRelPath(packRoot, workspaceRoot = resolveWorkspaceRoot(packRoot)) {
  return path.relative(workspaceRoot, packRoot).split(path.sep).join("/");
}
