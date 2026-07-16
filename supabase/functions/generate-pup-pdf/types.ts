export const PUP_PDF_PAYLOAD_VERSION = 1 as const;

export const COACHING_DISCLAIMER =
  "Uncloud360 is an adaptive human guidance platform that provides AI-powered coaching support. It is not a substitute for therapy, counseling, psychiatry, or any other licensed mental health or medical service. If you are experiencing a mental health crisis, please contact the 988 Suicide and Crisis Lifeline (call or text 988) or your local emergency services. Uncloud360 is not a covered entity under HIPAA.";

export type PupPdfTier = "pro" | "premium";

export type PupPdfNarrative = {
  generatedForTier?: PupPdfTier;
  coachingContext: string;
  coachingSummary?: string | null;
  nextFocus?: string | null;
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
