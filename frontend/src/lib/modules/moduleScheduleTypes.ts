import { isModuleSlug, type ModuleSlug } from "./moduleSlugs";

export const MODULE_REFRESH_REASONS = [
  "reassessment_90d",
  "score_drop",
  "life_event",
  "user_initiated",
] as const;

export type ModuleRefreshReason = (typeof MODULE_REFRESH_REASONS)[number];

export type ModuleScheduleEntry = {
  scheduledAt: string;
  unlockedAt: string | null;
  completedAt: string | null;
  unlockNotifiedAt?: string | null;
  unlockResentAt?: string | null;
  refreshOfferedAt?: string | null;
  refreshReason?: ModuleRefreshReason | null;
};

export type ModuleSchedules = Partial<Record<ModuleSlug, ModuleScheduleEntry>>;

export const EMPTY_MODULE_SCHEDULES: ModuleSchedules = {};

function isIsoDateString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isModuleRefreshReason(value: unknown): value is ModuleRefreshReason {
  return (
    typeof value === "string" &&
    (MODULE_REFRESH_REASONS as readonly string[]).includes(value)
  );
}

function parseScheduleEntry(value: unknown): ModuleScheduleEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!isIsoDateString(record.scheduledAt)) return null;
  return {
    scheduledAt: record.scheduledAt,
    unlockedAt: isIsoDateString(record.unlockedAt) ? record.unlockedAt : null,
    completedAt: isIsoDateString(record.completedAt) ? record.completedAt : null,
    unlockNotifiedAt: isIsoDateString(record.unlockNotifiedAt) ? record.unlockNotifiedAt : null,
    unlockResentAt: isIsoDateString(record.unlockResentAt) ? record.unlockResentAt : null,
    refreshOfferedAt: isIsoDateString(record.refreshOfferedAt) ? record.refreshOfferedAt : null,
    refreshReason: isModuleRefreshReason(record.refreshReason) ? record.refreshReason : null,
  };
}

export function parseModuleSchedules(value: unknown): ModuleSchedules {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_MODULE_SCHEDULES;
  }

  const parsed: ModuleSchedules = {};
  for (const [slug, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!isModuleSlug(slug)) continue;
    const scheduleEntry = parseScheduleEntry(entry);
    if (scheduleEntry) parsed[slug] = scheduleEntry;
  }
  return parsed;
}
