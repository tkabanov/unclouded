type OpenApiSourceKind = "api_event" | "external_http_call";

function normalizeSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "unknown";
}

function stableSuffix(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function inferredNamespaceToken(sourceId: string): string {
  const segments = sourceId.split(":").filter((segment) => segment.length > 0);
  if (sourceId.startsWith("external_call:") && segments.length >= 2) {
    return segments[1] ?? "external";
  }
  if (sourceId.startsWith("api_event:") && segments.length >= 2) {
    return segments[1] ?? "api";
  }
  if (segments.length >= 2) {
    return segments[1] ?? segments[0] ?? "default";
  }
  return segments[0] ?? "default";
}

export function deriveOperationId(sourceKind: OpenApiSourceKind, sourceId: string): string {
  const lane = sourceKind === "api_event" ? "incoming" : "outgoing";
  const base = normalizeSlug(sourceId);
  return `${lane}-${base}-${stableSuffix(sourceId)}`;
}

export function deriveOpenApiNamespaceSlug(sourceKind: OpenApiSourceKind, sourceId: string): string {
  const lane = sourceKind === "api_event" ? "incoming" : "outgoing";
  const namespaceToken = normalizeSlug(inferredNamespaceToken(sourceId));
  return `${lane}-${namespaceToken}`;
}
