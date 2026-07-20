const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return UUID_RE.test(value.trim());
}

export function assertValidUuid(value: string, label = "id"): string {
  const trimmed = value.trim();
  if (!isValidUuid(trimmed)) {
    throw new Error(`Invalid ${label}: expected a UUID`);
  }
  return trimmed;
}
