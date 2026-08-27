/** Format a session window for transactional emails (CL-4). */

function resolveTimeZoneOption(
  timeZone: string | null | undefined,
  mode: "omit" | "utcFallback",
): Intl.DateTimeFormatOptions {
  if (mode === "omit" && timeZone === undefined) {
    return {};
  }
  const zone =
    typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "UTC";
  return { timeZone: zone };
}

/**
 * @param timeZone — omit for legacy/user formatting (runtime default).
 *   Pass `null`/empty or an IANA string for coach mail (empty → UTC).
 */
export function formatSessionWhen(
  iso: string,
  durationMinutes: number,
  timeZone?: string | null,
): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const mode = arguments.length >= 3 ? "utcFallback" : "omit";
  const zoneOpts = resolveTimeZoneOption(timeZone, mode);
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: "full",
    timeStyle: "short",
    ...zoneOpts,
  };
  try {
    return `${start.toLocaleString("en-US", opts)} – ${end.toLocaleTimeString("en-US", {
      timeStyle: "short",
      ...zoneOpts,
    })} (${durationMinutes} min)`;
  } catch {
    const fallback: Intl.DateTimeFormatOptions = {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    };
    return `${start.toLocaleString("en-US", fallback)} – ${end.toLocaleTimeString("en-US", {
      timeStyle: "short",
      timeZone: "UTC",
    })} (${durationMinutes} min)`;
  }
}

/** Single timestamp label for coach briefs (CL-4). Empty TZ → UTC. */
export function formatScheduledAtLabel(
  iso: string,
  timeZone?: string | null,
): string {
  const zone =
    typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "UTC";
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: zone,
    });
  } catch {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    });
  }
}
