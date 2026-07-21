import {
  computeStabilityBandPercentages,
  type StabilityBandPercentages,
} from "./managerAggregateTrendHelpers.ts";

export const EMPLOYER_CLASSIFICATION_SMALL_CELL_MIN = 2;

export type ClassificationDistributionRow = {
  key: string;
  label: string;
  percent: number;
  count: number;
  suppressed: boolean;
};

export type EmployerAssessmentBaseline = {
  stabilityBands: StabilityBandPercentages | null;
  avgStability: number | null;
  avgPerformance: number | null;
  avgAlignment: number | null;
  classificationDistribution: ClassificationDistributionRow[];
  hasSuppressedClassificationCells: boolean;
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  capacity_erosion: "Capacity Erosion",
  performance_stagnation: "Performance Stagnation",
  alignment_fracture: "Alignment Fracture",
  high_output_hidden_instability: "High Output Hidden Instability",
  optimization_ready: "Optimization Ready",
  comfortable_plateau: "Comfortable Plateau",
  building_momentum: "Building Momentum",
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function normalizeClassificationKey(
  classification: string | null | undefined,
  results: Record<string, unknown> | null | undefined,
): string | null {
  if (results && typeof results === "object") {
    const nested = results.classification;
    if (nested && typeof nested === "object") {
      const key = (nested as Record<string, unknown>).key;
      if (typeof key === "string" && key.trim()) {
        return key.trim().toLowerCase().replace(/\s+/g, "_");
      }
      const name = (nested as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim()) {
        return name.trim().toLowerCase().replace(/\s+/g, "_");
      }
    }
  }

  if (typeof classification !== "string" || !classification.trim()) return null;
  return classification.trim().toLowerCase().replace(/\s+/g, "_");
}

function labelForClassificationKey(key: string): string {
  if (CLASSIFICATION_LABELS[key]) return CLASSIFICATION_LABELS[key];
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type EmployerProfileAssessmentRow = {
  classification?: string | null;
  stabilityScore?: number | null;
  performanceScore?: number | null;
  alignmentScore?: number | null;
  results?: Record<string, unknown> | null;
};

export function computeEmployerAssessmentBaseline(
  rows: EmployerProfileAssessmentRow[],
): EmployerAssessmentBaseline {
  const stabilityScores: number[] = [];
  const performanceScores: number[] = [];
  const alignmentScores: number[] = [];
  const classificationCounts = new Map<string, number>();

  for (const row of rows) {
    if (typeof row.stabilityScore === "number" && Number.isFinite(row.stabilityScore)) {
      stabilityScores.push(row.stabilityScore);
    }
    if (typeof row.performanceScore === "number" && Number.isFinite(row.performanceScore)) {
      performanceScores.push(row.performanceScore);
    }
    if (typeof row.alignmentScore === "number" && Number.isFinite(row.alignmentScore)) {
      alignmentScores.push(row.alignmentScore);
    }

    const key = normalizeClassificationKey(row.classification ?? null, row.results ?? null);
    if (key) {
      classificationCounts.set(key, (classificationCounts.get(key) ?? 0) + 1);
    }
  }

  const totalClassified = [...classificationCounts.values()].reduce((sum, count) => sum + count, 0);
  let hasSuppressedClassificationCells = false;

  const classificationDistribution: ClassificationDistributionRow[] = [...classificationCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([key, count]) => {
      const suppressed = count < EMPLOYER_CLASSIFICATION_SMALL_CELL_MIN;
      if (suppressed) hasSuppressedClassificationCells = true;
      return {
        key,
        label: labelForClassificationKey(key),
        count,
        percent:
          totalClassified > 0 && !suppressed
            ? Math.round((count / totalClassified) * 1000) / 10
            : 0,
        suppressed,
      };
    });

  return {
    stabilityBands: computeStabilityBandPercentages(stabilityScores),
    avgStability: average(stabilityScores),
    avgPerformance: average(performanceScores),
    avgAlignment: average(alignmentScores),
    classificationDistribution,
    hasSuppressedClassificationCells,
  };
}

export const EMPTY_EMPLOYER_ASSESSMENT_BASELINE: EmployerAssessmentBaseline = {
  stabilityBands: null,
  avgStability: null,
  avgPerformance: null,
  avgAlignment: null,
  classificationDistribution: [],
  hasSuppressedClassificationCells: false,
};
