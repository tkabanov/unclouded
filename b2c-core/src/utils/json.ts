import type { JsonValue } from "../types.js";

export function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getRecord(
  value: unknown,
): Record<string, JsonValue> | undefined {
  return isRecord(value) ? value : undefined;
}

export function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function getNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function asArray(value: unknown): JsonValue[] {
  return Array.isArray(value) ? value : [];
}

export function jsonPointerEscape(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function toPointer(parts: string[]): string {
  if (parts.length === 0) {
    return "/";
  }
  return `/${parts.map(jsonPointerEscape).join("/")}`;
}
