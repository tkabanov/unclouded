/** Shared module-unlock notification cohort logic (edge fn + frontend tests). */

export const MODULE_SLUGS = [
  "identity",
  "relational",
  "history",
  "financial",
  "body",
  "meaning",
] as const;

export type ModuleSlug = (typeof MODULE_SLUGS)[number];

export const MODULE_DISPLAY_TITLES: Record<ModuleSlug, string> = {
  identity: "The Identity Lens",
  relational: "Your Relational Blueprint",
  history: "Your History & Context",
  financial: "Financial Reality",
  body: "Your Body's Story",
  meaning: "What Holds You",
};

export const MODULE_COMPLETE_FLAG_KEYS: Record<ModuleSlug, string> = {
  identity: "moduleIdentityComplete",
  relational: "moduleRelationalComplete",
  history: "moduleHistoryComplete",
  financial: "moduleFinancialComplete",
  body: "moduleBodyComplete",
  meaning: "moduleMeaningComplete",
};

export type ModuleScheduleEntry = {
  scheduledAt: string;
  unlockedAt?: string | null;
  completedAt?: string | null;
  unlockNotifiedAt?: string | null;
  unlockResentAt?: string | null;
};

export type ModuleSchedules = Partial<Record<ModuleSlug, ModuleScheduleEntry>>;

export type ModuleUnlockCandidate = {
  userId: string;
  email: string | null;
  firstName: string | null;
  slug: ModuleSlug;
  displayTitle: string;
  kind: "initial" | "resend";
  scheduledAt: string;
};

export type ModuleUnlockProfileRow = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  timeZone?: string | null;
  onboardingCompleted?: boolean;
  lastNotificationSentAt?: string | null;
  moduleSchedules?: unknown;
  moduleIdentityComplete?: boolean;
  moduleRelationalComplete?: boolean;
  moduleHistoryComplete?: boolean;
  moduleFinancialComplete?: boolean;
  moduleBodyComplete?: boolean;
  moduleMeaningComplete?: boolean;
};

export const MODULE_UNLOCK_RESEND_MS = 3 * 24 * 60 * 60 * 1000;

function isIsoDateString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isModuleSlug(value: string): value is ModuleSlug {
  return (MODULE_SLUGS as readonly string[]).includes(value);
}

export function parseModuleSchedules(value: unknown): ModuleSchedules {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const parsed: ModuleSchedules = {};
  for (const [slug, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!isModuleSlug(slug)) continue;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (!isIsoDateString(record.scheduledAt)) continue;
    parsed[slug] = {
      scheduledAt: record.scheduledAt,
      unlockedAt: isIsoDateString(record.unlockedAt) ? record.unlockedAt : null,
      completedAt: isIsoDateString(record.completedAt) ? record.completedAt : null,
      unlockNotifiedAt: isIsoDateString(record.unlockNotifiedAt) ? record.unlockNotifiedAt : null,
      unlockResentAt: isIsoDateString(record.unlockResentAt) ? record.unlockResentAt : null,
    };
  }
  return parsed;
}

export function getDateKey(date: Date, timeZone: string | null | undefined): string {
  const tz = timeZone?.trim() || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

export function isNotificationSentToday(
  lastNotificationSentAt: string | null | undefined,
  now: Date,
  timeZone: string | null | undefined,
): boolean {
  if (!lastNotificationSentAt) {
    return false;
  }
  return getDateKey(new Date(lastNotificationSentAt), timeZone) === getDateKey(now, timeZone);
}

function isModuleComplete(row: ModuleUnlockProfileRow, slug: ModuleSlug): boolean {
  const flagKey = MODULE_COMPLETE_FLAG_KEYS[slug];
  const flagValue = row[flagKey as keyof ModuleUnlockProfileRow];
  if (typeof flagValue === "boolean") {
    return flagValue;
  }
  const schedules = parseModuleSchedules(row.moduleSchedules);
  return Boolean(schedules[slug]?.completedAt);
}

type EligibleModule = {
  slug: ModuleSlug;
  kind: "initial" | "resend";
  scheduledAt: string;
};

function listEligibleModules(
  row: ModuleUnlockProfileRow,
  schedules: ModuleSchedules,
  nowMs: number,
): EligibleModule[] {
  const eligible: EligibleModule[] = [];

  for (const slug of MODULE_SLUGS) {
    if (isModuleComplete(row, slug)) {
      continue;
    }

    const entry = schedules[slug];
    if (!entry?.scheduledAt) {
      continue;
    }

    const scheduledMs = new Date(entry.scheduledAt).getTime();
    if (scheduledMs > nowMs) {
      continue;
    }

    if (!entry.unlockNotifiedAt) {
      eligible.push({ slug, kind: "initial", scheduledAt: entry.scheduledAt });
      continue;
    }

    if (entry.unlockResentAt) {
      continue;
    }

    const notifiedMs = new Date(entry.unlockNotifiedAt).getTime();
    if (nowMs - notifiedMs >= MODULE_UNLOCK_RESEND_MS) {
      eligible.push({ slug, kind: "resend", scheduledAt: entry.scheduledAt });
    }
  }

  return eligible;
}

export function pickModuleUnlockForProfile(
  row: ModuleUnlockProfileRow,
  now: Date = new Date(),
): ModuleUnlockCandidate | null {
  if (!row.onboardingCompleted) {
    return null;
  }

  if (isNotificationSentToday(row.lastNotificationSentAt, now, row.timeZone)) {
    return null;
  }

  const schedules = parseModuleSchedules(row.moduleSchedules);
  const eligible = listEligibleModules(row, schedules, now.getTime());
  if (eligible.length === 0) {
    return null;
  }

  eligible.sort(
    (left, right) =>
      new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
  );
  const chosen = eligible[0];

  return {
    userId: row.id,
    email: row.email ?? null,
    firstName: row.firstName ?? null,
    slug: chosen.slug,
    displayTitle: MODULE_DISPLAY_TITLES[chosen.slug],
    kind: chosen.kind,
    scheduledAt: chosen.scheduledAt,
  };
}

export function listModuleUnlockCandidatesFromRows(
  rows: ModuleUnlockProfileRow[],
  now: Date = new Date(),
): ModuleUnlockCandidate[] {
  const candidates: ModuleUnlockCandidate[] = [];
  for (const row of rows) {
    const candidate = pickModuleUnlockForProfile(row, now);
    if (candidate) {
      candidates.push(candidate);
    }
  }
  return candidates;
}

export function buildModuleUnlockSchedulePatch(
  schedules: ModuleSchedules,
  slug: ModuleSlug,
  kind: "initial" | "resend",
  stampedAt: string,
): ModuleSchedules {
  const current = schedules[slug] ?? { scheduledAt: stampedAt, unlockedAt: null, completedAt: null };
  const next: ModuleScheduleEntry = { ...current };

  if (kind === "initial") {
    next.unlockNotifiedAt = stampedAt;
  } else {
    next.unlockResentAt = stampedAt;
  }

  return { ...schedules, [slug]: next };
}
