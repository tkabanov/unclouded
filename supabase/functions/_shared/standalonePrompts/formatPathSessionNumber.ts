/**
 * Spec format for path closing / chat handoff: "Session 3 of 6".
 * When total is unknown, returns "Session N" (never "of path").
 */
export function formatPathSessionNumber(
  sessionIndex: number | string | null | undefined,
  totalSessions?: number | string | null,
): string {
  const index =
    typeof sessionIndex === "number"
      ? sessionIndex
      : typeof sessionIndex === "string"
        ? Number.parseInt(sessionIndex.trim(), 10)
        : NaN;
  const indexLabel = Number.isFinite(index) && index > 0 ? String(index) : "?";

  const total =
    typeof totalSessions === "number"
      ? totalSessions
      : typeof totalSessions === "string"
        ? Number.parseInt(totalSessions.trim(), 10)
        : NaN;

  if (Number.isFinite(total) && total > 0) {
    return `Session ${indexLabel} of ${total}`;
  }
  return `Session ${indexLabel}`;
}
