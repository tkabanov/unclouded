import type { SignUpUserMetadata } from "@/lib/auth/credentialsApi";

export const UTM_SOURCE_PARAM = "utm_source";
export const UTM_MEDIUM_PARAM = "utm_medium";
export const UTM_CAMPAIGN_PARAM = "utm_campaign";

export const UTM_SOURCE_AUTH_METADATA_KEY = "utm_source";
export const UTM_MEDIUM_AUTH_METADATA_KEY = "utm_medium";
export const UTM_CAMPAIGN_AUTH_METADATA_KEY = "utm_campaign";

const PENDING_UTM_STORAGE_KEY = "uncloud360.pendingUtmParams";
const UTM_MAX_LENGTH = 128;
const UTM_VALUE_PATTERN = /^[\w.-]+$/;

export interface PendingUtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/** Normalize and validate a UTM value from a marketing link. */
export function normalizeUtmValue(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim();
  if (normalized.length > UTM_MAX_LENGTH) return null;
  if (!UTM_VALUE_PATTERN.test(normalized)) return null;
  return normalized;
}

export function readUtmFromSearch(search: string): PendingUtmParams {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const result: PendingUtmParams = {};

  const source = normalizeUtmValue(params.get(UTM_SOURCE_PARAM));
  const medium = normalizeUtmValue(params.get(UTM_MEDIUM_PARAM));
  const campaign = normalizeUtmValue(params.get(UTM_CAMPAIGN_PARAM));

  if (source) result.utm_source = source;
  if (medium) result.utm_medium = medium;
  if (campaign) result.utm_campaign = campaign;

  return result;
}

function persistPendingUtmParams(params: PendingUtmParams): void {
  try {
    sessionStorage.setItem(PENDING_UTM_STORAGE_KEY, JSON.stringify(params));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function peekPendingUtmParams(): PendingUtmParams | null {
  try {
    const raw = sessionStorage.getItem(PENDING_UTM_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: PendingUtmParams = {};

    const source = normalizeUtmValue(
      typeof parsed.utm_source === "string" ? parsed.utm_source : null,
    );
    const medium = normalizeUtmValue(
      typeof parsed.utm_medium === "string" ? parsed.utm_medium : null,
    );
    const campaign = normalizeUtmValue(
      typeof parsed.utm_campaign === "string" ? parsed.utm_campaign : null,
    );

    if (source) result.utm_source = source;
    if (medium) result.utm_medium = medium;
    if (campaign) result.utm_campaign = campaign;

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

export function clearPendingUtmParams(): void {
  try {
    sessionStorage.removeItem(PENDING_UTM_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** Read UTM params from the URL and persist them for the upcoming signup. */
export function captureUtmFromSearch(search: string): PendingUtmParams | null {
  const fromUrl = readUtmFromSearch(search);
  if (Object.keys(fromUrl).length === 0) return peekPendingUtmParams();

  const existing = peekPendingUtmParams() ?? {};
  const merged: PendingUtmParams = { ...existing, ...fromUrl };
  persistPendingUtmParams(merged);
  return merged;
}

export function buildSignupUtmMetadata(
  params: PendingUtmParams | null,
): SignUpUserMetadata | undefined {
  if (!params) return undefined;

  const metadata: SignUpUserMetadata = {};
  if (params.utm_source) metadata[UTM_SOURCE_AUTH_METADATA_KEY] = params.utm_source;
  if (params.utm_medium) metadata[UTM_MEDIUM_AUTH_METADATA_KEY] = params.utm_medium;
  if (params.utm_campaign) metadata[UTM_CAMPAIGN_AUTH_METADATA_KEY] = params.utm_campaign;

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}
