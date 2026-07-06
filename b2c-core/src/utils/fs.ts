import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path));
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(path, serialized, "utf8");
}

export async function readTextFile(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function removeDirIfExists(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true, force: true });
  } catch {
    // no-op
  }
}

export async function listFilesRecursively(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        out.push(absolute);
      }
    }
  }
  try {
    const rootStat = await stat(root);
    if (!rootStat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }
  await walk(root);
  out.sort();
  return out;
}
