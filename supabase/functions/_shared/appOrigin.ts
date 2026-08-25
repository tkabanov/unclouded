/**
 * App origin resolution for redirects (Stripe return URLs, email CTAs, invites).
 *
 * Interactive flows (Checkout / Customer Portal) should pass the browser origin
 * so localhost QA and Vercel prod can share one Supabase project without
 * flipping APP_ORIGIN between deploys.
 *
 * Server-only jobs (cron emails) use canonicalAppOrigin() from env.
 */

export const DEFAULT_APP_ORIGIN = "https://uncloud360.vercel.app";

const BUILTIN_ALLOWED_ORIGINS = [
  DEFAULT_APP_ORIGIN,
  "https://uncloud360.ai",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

/** Strip trailing slash; return null if not an absolute http(s) origin. */
export function normalizeOrigin(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // Origin only — no path/query (guards open redirects).
    return url.origin;
  } catch {
    return null;
  }
}

function envOriginList(): string[] {
  const values = [
    Deno.env.get("APP_ORIGIN"),
    Deno.env.get("APP_URL"),
    ...(Deno.env.get("APP_ORIGINS") ?? "").split(","),
  ];
  const out: string[] = [];
  for (const value of values) {
    const origin = normalizeOrigin(value);
    if (origin) out.push(origin);
  }
  return out;
}

function isVercelPreviewOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    // Production + preview deploys for this Vercel project.
    return (
      hostname === "uncloud360.vercel.app" ||
      /^uncloud360[-a-z0-9]*\.vercel\.app$/i.test(hostname)
    );
  } catch {
    return false;
  }
}

export function isAllowedAppOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (BUILTIN_ALLOWED_ORIGINS.includes(normalized as (typeof BUILTIN_ALLOWED_ORIGINS)[number])) {
    return true;
  }
  if (envOriginList().includes(normalized)) return true;
  return isVercelPreviewOrigin(normalized);
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Canonical origin for server-initiated links (emails, invites).
 * Prefers APP_ORIGIN, then APP_URL. If the only configured value is a local
 * dev origin (common when one Supabase project serves both localhost QA and
 * Vercel), fall through to the production default so email CTAs stay usable.
 */
export function canonicalAppOrigin(): string {
  for (const value of [Deno.env.get("APP_ORIGIN"), Deno.env.get("APP_URL")]) {
    const origin = normalizeOrigin(value);
    if (origin && !isLocalDevOrigin(origin)) return origin;
  }
  return DEFAULT_APP_ORIGIN;
}

/**
 * Resolve the origin to use for a user-facing redirect in an interactive request.
 * Preference: explicit body origin → Origin header → Referer → canonical env.
 * Unknown origins never win (open-redirect guard); fall back to canonical.
 */
export function resolveRequestAppOrigin(
  req: Request,
  bodyOrigin?: string | null,
): string {
  const candidates = [
    bodyOrigin,
    req.headers.get("origin"),
    (() => {
      const referer = req.headers.get("referer");
      if (!referer) return null;
      try {
        return new URL(referer).origin;
      } catch {
        return null;
      }
    })(),
  ];

  for (const candidate of candidates) {
    const origin = normalizeOrigin(candidate);
    if (origin && isAllowedAppOrigin(origin)) return origin;
  }

  return canonicalAppOrigin();
}

/** @deprecated Prefer resolveRequestAppOrigin for interactive Stripe redirects. */
export function appOrigin(): string {
  return canonicalAppOrigin();
}

/** Public post-session notes form URL for a booking token (NCLDD-31 §6). */
export function coachPostSessionFormUrl(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return canonicalAppOrigin();
  return `${canonicalAppOrigin()}/coach-session/${encodeURIComponent(trimmed)}`;
}
