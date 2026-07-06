import { createHash } from "node:crypto";

export function sha256Text(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function shortHash(input: string, length = 6): string {
  return sha256Text(input).slice(0, length);
}
