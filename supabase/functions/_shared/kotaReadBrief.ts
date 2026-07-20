/** Block 3.35 — structured Kota's Read coach handoff brief. */

export type KotaReadPattern = {
  pattern: string;
  trigger: string;
  approachTried: string;
  result: string;
};

export type KotaReadBrief = {
  sessionThemes: string;
  patterns: KotaReadPattern[];
  underneath: string;
  caution: string;
};

export type KotaReadContext = {
  firstName: string;
  classificationLine: string;
  scoresLine: string;
  pathsLine: string;
  openCommitmentLine: string;
  sessionMemoryLines: string[];
  memoryFactsJson: string;
};

export const KOTA_READ_SYSTEM_PROMPT =
  "You are Kota, the AI coaching presence in Uncloud360. Produce a structured coach handoff brief as JSON only — no prose outside JSON. Ground every field in the supplied session history and memory. Do not speculate about clinical conditions. Do not include information that would violate coaching trust.";

export const KOTA_READ_JSON_INSTRUCTIONS = `Return JSON with this exact shape:
{
  "sessionThemes": "2-4 sentences summarizing session themes from the supplied history",
  "patterns": [
    {
      "pattern": "what the user tends to do",
      "trigger": "when it shows up",
      "approachTried": "what Kota tried",
      "result": "what happened"
    }
  ],
  "underneath": "one presenting issue or thread where something deeper has not surfaced yet",
  "caution": "sensitivity or fingerprint signal plus an approach that tends to backfire"
}

Rules:
- Include 1 to 3 patterns only when supported by the history.
- patterns must be specific — no generic coaching language.
- underneath names the presenting issue in plain language (the formatter adds the handoff framing).
- caution must name a concrete sensitivity and a concrete approach to avoid.
- No markdown, no bullet lists, no clinical diagnoses.`;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readPattern(value: unknown): KotaReadPattern | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const pattern = readString(row.pattern);
  const trigger = readString(row.trigger);
  const approachTried = readString(row.approachTried);
  const result = readString(row.result);
  if (!pattern || !trigger || !approachTried || !result) return null;
  return { pattern, trigger, approachTried, result };
}

export function parseKotaReadBrief(raw: unknown): KotaReadBrief | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Record<string, unknown>;
  const sessionThemes = readString(row.sessionThemes);
  const underneath = readString(row.underneath);
  const caution = readString(row.caution);
  const patterns = Array.isArray(row.patterns)
    ? row.patterns
        .map((entry) => readPattern(entry))
        .filter((entry): entry is KotaReadPattern => entry !== null)
        .slice(0, 3)
    : [];

  if (!sessionThemes || !underneath || !caution || patterns.length === 0) {
    return null;
  }

  return { sessionThemes, patterns, underneath, caution };
}

export function formatPatternLine(pattern: KotaReadPattern): string {
  return `This user tends to ${pattern.pattern}. It shows up when ${pattern.trigger}. Kota has tried ${pattern.approachTried} with ${pattern.result}.`;
}

export function formatUnderneathLine(underneath: string): string {
  const trimmed = underneath.trim();
  if (/^there is something underneath/i.test(trimmed)) return trimmed;
  return `There is something underneath ${trimmed} that has not surfaced yet. Worth exploring.`;
}

export function formatCautionLine(caution: string): string {
  const trimmed = caution.trim();
  if (/^this user/i.test(trimmed)) return trimmed;
  return `This user ${trimmed}`;
}

/** Render Block 3.35 structured brief for coachBooking.kotaRead storage. */
export function formatKotaReadBrief(brief: KotaReadBrief): string {
  const sections = [
    "KOTA'S READ — Coach handoff brief",
    "",
    "Session themes (recent)",
    brief.sessionThemes.trim(),
    "",
    "Patterns observed",
    ...brief.patterns.map((pattern, index) => `${index + 1}. ${formatPatternLine(pattern)}`),
    "",
    "Underneath",
    formatUnderneathLine(brief.underneath),
    "",
    "Be careful about",
    formatCautionLine(brief.caution),
  ];

  return sections.join("\n").trim();
}

export function buildKotaReadUserPrompt(context: KotaReadContext): string {
  return [
    KOTA_READ_JSON_INSTRUCTIONS,
    "",
    "Factual context for the coach (use as grounding; do not repeat verbatim unless relevant):",
    `Member: ${context.firstName}`,
    context.classificationLine,
    context.scoresLine,
    context.pathsLine,
    context.openCommitmentLine,
    "",
    "Recent session memory:",
    context.sessionMemoryLines.length > 0
      ? context.sessionMemoryLines.join("\n")
      : "(none recorded)",
    "",
    "Longitudinal memory facts:",
    context.memoryFactsJson,
  ].join("\n");
}

export function buildClassificationLine(results: Record<string, unknown> | null): string {
  if (!results) return "Classification: not recorded";
  const classification = results.classification;
  if (classification && typeof classification === "object") {
    const name = readString((classification as Record<string, unknown>).name);
    if (name) return `Classification: ${name}`;
  }
  const fallback = readString(results.classification);
  return fallback ? `Classification: ${fallback}` : "Classification: not recorded";
}

export function buildScoresLine(results: Record<string, unknown> | null): string {
  if (!results) return "Scores: not recorded";
  const stability = results.stability_score;
  const performance = results.performance_score;
  const alignment = results.alignment_score;
  if (
    typeof stability !== "number" ||
    typeof performance !== "number" ||
    typeof alignment !== "number"
  ) {
    return "Scores: not recorded";
  }
  return `Scores — Stability ${stability.toFixed(1)}, Performance ${performance.toFixed(1)}, Alignment ${alignment.toFixed(1)}`;
}

export function sessionMemoryToLines(
  records: Array<{
    topic: string;
    summaryStub: string;
    microCommitment?: string | null;
    keyPatternOrInsight?: string | null;
    closedAt: string;
  }>,
): string[] {
  return records.map((record) => {
    const parts = [`- ${record.topic}: ${record.summaryStub}`];
    if (record.microCommitment?.trim()) {
      parts.push(`  Commitment: ${record.microCommitment.trim()}`);
    }
    if (record.keyPatternOrInsight?.trim()) {
      parts.push(`  Pattern/insight: ${record.keyPatternOrInsight.trim()}`);
    }
    parts.push(`  Closed: ${record.closedAt}`);
    return parts.join("\n");
  });
}

export function resolveOpenCommitmentLine(
  sessionRecords: Array<{ microCommitment?: string | null }>,
  onboardingData: Record<string, unknown> | null,
): string {
  for (let index = sessionRecords.length - 1; index >= 0; index -= 1) {
    const commitment = sessionRecords[index]?.microCommitment?.trim();
    if (commitment) return `Open commitment: ${commitment}`;
  }

  const keys = ["micro_commitment_active_text", "micro_commitment_active", "activeMicroCommitment"];
  for (const key of keys) {
    const value = onboardingData?.[key];
    if (typeof value === "string" && value.trim()) {
      return `Open commitment: ${value.trim()}`;
    }
  }

  return "Open commitment: none recorded";
}

export function buildPathsLine(
  enrollments: Array<{ pathName: string; status: string; completedSessionsCount: number }>,
): string {
  if (enrollments.length === 0) return "Active paths: none recorded";
  return `Active paths: ${enrollments
    .map(
      (entry) =>
        `${entry.pathName} (${entry.status}, ${entry.completedSessionsCount} sessions completed)`,
    )
    .join("; ")}`;
}
