import { supabase } from "@/integrations/supabase/client";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export function slugifyPathName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface PathSessionSummary {
  id: string;
  index: number;
  title: string;
  coachingText: string;
  microCommitment: string;
}

export interface PathCatalogEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier: TierSlug;
  pillar: string;
  subMode?: string;
  sessionsCount: number;
  triggerSignals?: string;
}

type PathRow = {
  id?: string;
  name?: string;
  description?: string;
  tier?: string;
  pillar?: string;
  subMode?: string;
  sessionsCount?: number | string | null;
  triggerSignals?: string | null;
};

type PathsessionRow = {
  id?: string;
  index?: number | string | null;
  title?: string;
  coachingText?: string;
  microCommitment?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function isTierSlug(value: string | undefined): value is TierSlug {
  return value === TIER.FREE || value === TIER.PRO || value === TIER.PREMIUM;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function mapPathRow(row: PathRow): PathCatalogEntry | null {
  const id = row.id?.trim();
  const name = row.name?.trim();
  if (!id || !name) return null;

  return {
    id,
    slug: slugifyPathName(name),
    name,
    description: row.description?.trim() ?? "",
    tier: isTierSlug(row.tier) ? row.tier : TIER.FREE,
    pillar: row.pillar?.trim() ?? "",
    subMode: row.subMode?.trim() || undefined,
    sessionsCount: toNumber(row.sessionsCount),
    triggerSignals: row.triggerSignals?.trim() || undefined,
  };
}

function mapSessionRow(row: PathsessionRow): PathSessionSummary | null {
  if (!row.id) return null;
  return {
    id: row.id,
    index: toNumber(row.index) || 1,
    title: row.title?.trim() ?? "",
    coachingText: row.coachingText?.trim() ?? "",
    microCommitment: row.microCommitment?.trim() ?? "",
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

async function fetchPathRowById(pathId: string): Promise<PathCatalogEntry | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("path")
    .select("id, name, description, tier, pillar, subMode, sessionsCount, triggerSignals")
    .eq("id", pathId)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!data || typeof data !== "object") return null;
  return mapPathRow(data as PathRow);
}

async function fetchPathRowBySlug(slug: string): Promise<PathCatalogEntry | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("path")
    .select("id, name, description, tier, pillar, subMode, sessionsCount, triggerSignals");

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return null;

  const normalizedSlug = slugifyPathName(slug);
  const normalizedName = slug.trim().toLowerCase();
  for (const row of data) {
    const mapped = mapPathRow(row as PathRow);
    if (!mapped) continue;
    if (mapped.slug === normalizedSlug) return mapped;
    if (mapped.name.toLowerCase() === normalizedName) return mapped;
  }

  return null;
}

/** All guided paths for library browse (sorted by name). */
export async function fetchPathCatalog(): Promise<PathCatalogEntry[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("path")
    .select("id, name, description, tier, pillar, subMode, sessionsCount, triggerSignals")
    .order("name", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => mapPathRow(row as PathRow))
    .filter((item): item is PathCatalogEntry => item !== null);
}

export async function fetchPathCatalogEntry(
  pathIdOrSlug: string,
): Promise<PathCatalogEntry | null> {
  const key = pathIdOrSlug.trim();
  if (!key) return null;

  if (isUuid(key)) {
    const byId = await fetchPathRowById(key);
    if (byId) return byId;
  }

  return fetchPathRowBySlug(key);
}

export async function fetchPathSessions(pathId: string): Promise<PathSessionSummary[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathSession")
    .select("id, index, title, coachingText, microCommitment")
    .eq("pathId", pathId)
    .order("index", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => mapSessionRow(row as PathsessionRow))
    .filter((item): item is PathSessionSummary => item !== null);
}

export async function fetchPathSessionsByKey(
  pathIdOrSlug: string,
): Promise<PathSessionSummary[]> {
  const path = await fetchPathCatalogEntry(pathIdOrSlug);
  if (!path) return [];
  return fetchPathSessions(path.id);
}

export async function fetchPathSessionTitle(sessionId: string): Promise<string | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathSession")
    .select("title")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!data || typeof data !== "object") return null;
  const title = (data as { title?: string }).title?.trim();
  return title || null;
}

export async function fetchPathSessionsByIds(
  sessionIds: string[],
): Promise<Map<string, PathSessionSummary>> {
  const uniqueIds = [...new Set(sessionIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathSession")
    .select("id, index, title, coachingText, microCommitment")
    .in("id", uniqueIds);

  if (error) {
    if (isSchemaUnavailable(error)) return new Map();
    throw error;
  }

  const map = new Map<string, PathSessionSummary>();
  if (!Array.isArray(data)) return map;

  for (const row of data) {
    const session = mapSessionRow(row as PathsessionRow);
    if (session) map.set(session.id, session);
  }

  return map;
}
