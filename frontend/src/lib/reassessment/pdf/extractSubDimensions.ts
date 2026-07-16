import type { PupPdfSubDimension } from "@/lib/reassessment/pdf/pupPdfTypes";

const AGGREGATE_KEYS = new Set([
  "stability_score",
  "performance_score",
  "alignment_score",
  "orientation_score",
  "orientationScore",
]);

function isAggregateKey(key: string): boolean {
  const normalized = key.trim();
  if (AGGREGATE_KEYS.has(normalized)) return true;
  if (/_score$/i.test(normalized)) return true;
  if (/^(stability|performance|alignment|orientation)\s+score$/i.test(normalized)) {
    return true;
  }
  return false;
}

function normalizeQuestionLabel(key: string): string {
  const match = key.match(/^[spa]?q(\d+)$/i) ?? key.match(/^q(\d+)$/i);
  if (match) return `Q${match[1]}`;
  return key.replace(/_/g, " ");
}

function questionSortKey(label: string): number {
  const match = label.match(/^Q(\d+)$/i);
  return match ? Number(match[1]) : 999;
}

function readQuestionMap(raw: unknown): Array<{ label: string; score: number }> {
  if (!raw || typeof raw !== "object") return [];
  const questions: Array<{ label: string; score: number }> = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isAggregateKey(key)) continue;
    const score = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(score)) continue;
    questions.push({ label: normalizeQuestionLabel(key), score });
  }
  return questions.sort((a, b) => questionSortKey(a.label) - questionSortKey(b.label));
}

/** Pull per-question pillar scores from reassessment rawScores when present. */
export function extractSubDimensions(rawScores: unknown): PupPdfSubDimension[] {
  if (!rawScores || typeof rawScores !== "object") return [];
  const scores = rawScores as Record<string, unknown>;
  const pillars: Array<{ key: string; pillar: string }> = [
    { key: "stabilityScores", pillar: "Stability" },
    { key: "performanceScores", pillar: "Performance" },
    { key: "alignmentScores", pillar: "Alignment" },
  ];

  const out: PupPdfSubDimension[] = [];
  for (const { key, pillar } of pillars) {
    const questions = readQuestionMap(scores[key]);
    if (questions.length > 0) {
      out.push({ pillar, questions });
    }
  }
  return out;
}

/**
 * Normalize labels from edge payload (may still send sq1 / stability_score
 * until the edge function is redeployed).
 */
export function sanitizeSubDimensions(
  groups: PupPdfSubDimension[] | undefined | null,
): PupPdfSubDimension[] {
  if (!groups?.length) return [];
  return groups
    .map((group) => {
      const questions = group.questions
        .filter((q) => !isAggregateKey(q.label) && Number.isFinite(q.score))
        .map((q) => ({ label: normalizeQuestionLabel(q.label), score: q.score }))
        .sort((a, b) => questionSortKey(a.label) - questionSortKey(b.label));
      return { pillar: group.pillar, questions };
    })
    .filter((group) => group.questions.length > 0);
}
