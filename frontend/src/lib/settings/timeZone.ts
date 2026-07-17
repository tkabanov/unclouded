export function detectBrowserTimeZone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof zone === "string" && zone.trim()) {
      return zone.trim();
    }
  } catch {
    // ignore
  }
  return null;
}
