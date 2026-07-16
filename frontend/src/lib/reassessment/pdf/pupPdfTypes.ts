export const PUP_PDF_PAYLOAD_VERSION = 1 as const;

/** Bump when client PDF layout changes — invalidates cached files. */
export const PUP_PDF_RENDER_VERSION = 4 as const;

export const PUP_PDF_STORAGE_BUCKET = "pup-pdf-reports" as const;

export const COACHING_DISCLAIMER =
  "Uncloud360 is an adaptive human guidance platform that provides AI-powered coaching support. It is not a substitute for therapy, counseling, psychiatry, or any other licensed mental health or medical service. If you are experiencing a mental health crisis, please contact the 988 Suicide and Crisis Lifeline (call or text 988) or your local emergency services. Uncloud360 is not a covered entity under HIPAA.";

export type PupPdfTier = "pro" | "premium";

export type PupPdfNarrative = {
  /** Tier the narrative was generated for — used to invalidate on upgrade. */
  generatedForTier?: PupPdfTier;
  /** Client render layout version — used to invalidate after visual fixes. */
  renderVersion?: number;
  coachingContext: string;
  coachingSummary?: string | null;
  nextFocus?: string | null;
};

export type PupPdfCacheRow = {
  pdfGenerated: boolean;
  pdfUrl: string | null;
  pdfNarrative: unknown;
};

export type PupPdfScorePoint = {
  date: string;
  stability: number | null;
  performance: number | null;
  alignment: number | null;
  classification: string | null;
};

export type PupPdfSubDimension = {
  pillar: string;
  questions: Array<{ label: string; score: number }>;
};

export type PupPdfPathHistoryItem = {
  pathName: string;
  status: string;
  completedSessionsCount: number;
};

export type PupPdfReflection = {
  field: string;
  question: string;
  answer: string;
};

export type PupPdfPayload = {
  version: typeof PUP_PDF_PAYLOAD_VERSION;
  tier: PupPdfTier;
  assessmentResultId: string;
  firstName: string;
  assessmentDate: string;
  platformName: string;
  scores: {
    stability: number;
    performance: number;
    alignment: number;
    orientation: number | null;
  };
  classificationName: string;
  classificationDescription: string;
  focusAreas: string[];
  trajectoryType: string | null;
  trajectoryStatement: string | null;
  microCommitment: string | null;
  reflections: PupPdfReflection[];
  disclaimer: string;
  narrative: PupPdfNarrative;
  subDimensions?: PupPdfSubDimension[];
  scoreTrend?: PupPdfScorePoint[];
  behavioralFingerprint?: string | null;
  pathHistory?: PupPdfPathHistoryItem[];
  premiumBranding?: boolean;
};

export function pdfStoragePath(userId: string, assessmentResultId: string): string {
  return `${userId}/${assessmentResultId}.pdf`;
}

export function pdfDownloadLabel(tier: PupPdfTier): string {
  return tier === "premium" ? "Download my PuP 360 report" : "Download my PuP 360 summary";
}

export function parseStoredPdfNarrative(raw: unknown): PupPdfNarrative | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const coachingContext =
    typeof obj.coachingContext === "string" ? obj.coachingContext.trim() : "";
  if (!coachingContext) return null;
  const generatedForTier =
    obj.generatedForTier === "pro" || obj.generatedForTier === "premium"
      ? obj.generatedForTier
      : undefined;
  return {
    generatedForTier,
    renderVersion:
      typeof obj.renderVersion === "number" ? obj.renderVersion : undefined,
    coachingContext,
    coachingSummary:
      typeof obj.coachingSummary === "string" ? obj.coachingSummary.trim() : null,
    nextFocus: typeof obj.nextFocus === "string" ? obj.nextFocus.trim() : null,
  };
}

/** True when no persisted PDF exists or cache is stale for tier/layout. */
export function shouldGeneratePupPdf(
  row: PupPdfCacheRow,
  currentTier: PupPdfTier,
): boolean {
  if (!row.pdfGenerated || !row.pdfUrl) return true;
  return needsPupPdfRegeneration(row.pdfNarrative, currentTier, true);
}

/** True when cached PDF/narrative does not match the user's current paid tier. */
export function needsPupPdfRegeneration(
  storedNarrative: unknown,
  currentTier: PupPdfTier,
  hasPdfUrl: boolean,
): boolean {
  if (!hasPdfUrl) return true;
  const narrative = parseStoredPdfNarrative(storedNarrative);
  if (!narrative) return true;
  if (narrative.renderVersion !== PUP_PDF_RENDER_VERSION) return true;
  if (narrative.generatedForTier && narrative.generatedForTier !== currentTier) {
    return true;
  }
  if (currentTier === "premium" && (!narrative.coachingSummary || !narrative.nextFocus)) {
    return true;
  }
  return false;
}
