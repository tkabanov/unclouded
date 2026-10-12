import {
  arr,
  callRpc,
  num,
  numOrNull,
  rec,
  str,
  strOrNull,
  type Raw,
} from "@/lib/settings/admin/adminAiUsageApi";

import {
  AI_FEEDBACK_NEGATIVE_REASONS,
  AI_FEEDBACK_POSITIVE_REASONS,
  AI_INSIGHT_CONCERNS,
  AI_INSIGHT_REQUEST_TYPES,
  AI_INSIGHT_TOPICS,
  taxonomyLabel,
} from "../../../../../supabase/functions/_shared/aiInsights/taxonomy.ts";

/**
 * NCLDD-55 (OVR-073) — admin AI Insights. Aggregates only: the RPC returns taxonomy keys and
 * counts for consenting users, with every row backed by >= kThreshold distinct users.
 */

export type InsightCount = { key: string; label: string; sessions: number; users: number };

export type InsightSeriesPoint = { bucket: string; key: string; sessions: number };

export type InsightResourceCount = {
  resourceId: string;
  title: string;
  sessions: number;
  users: number;
};

/** When `suppressed` (fewer than kThreshold raters), the counts are 0 and must not be shown. */
export type InsightFeedback = {
  suppressed: boolean;
  ratedMessages: number;
  raters: number;
  up: number;
  down: number;
  upShare: number;
  reasons: { key: string; label: string; rating: 1 | -1; count: number }[];
};

export type AiInsightsOverview = {
  /**
   * Effective period: the request widened/clipped server-side to whole closed weeks or months
   * ending before today (UTC). `from`/`to` are null when no closed bucket exists yet.
   */
  period: {
    from: string | null;
    to: string | null;
    bucket: "week" | "month";
    requestedFrom: string;
    requestedTo: string;
  };
  kThreshold: number;
  /** When `suppressed`, fewer than kThreshold people: counts are 0 and nothing else is returned. */
  sample: {
    suppressed: boolean;
    users: number;
    sessions: number;
    /** Null when fewer than kThreshold people used that mode. */
    textSessions: number | null;
    voiceSessions: number | null;
  };
  topics: InsightCount[];
  topicsSeries: InsightSeriesPoint[];
  requestTypes: InsightCount[];
  concerns: InsightCount[];
  resources: InsightResourceCount[];
  crisisLines: { suppressed: boolean; sessions: number; users: number };
  feedback: InsightFeedback;
};

function counts(value: unknown, labels: Parameters<typeof taxonomyLabel>[0]): InsightCount[] {
  return arr(value).map((row) => ({
    key: str(row.key),
    label: taxonomyLabel(labels, str(row.key)),
    sessions: num(row.sessions),
    users: num(row.users),
  }));
}

function feedbackReasonLabel(key: string, rating: 1 | -1): string {
  return taxonomyLabel(
    rating === 1 ? AI_FEEDBACK_POSITIVE_REASONS : AI_FEEDBACK_NEGATIVE_REASONS,
    key,
  );
}

function mapFeedback(value: unknown): InsightFeedback {
  const raw = rec(value);
  if (raw.suppressed !== false) {
    return {
      suppressed: true,
      ratedMessages: 0,
      raters: 0,
      up: 0,
      down: 0,
      upShare: 0,
      reasons: [],
    };
  }
  return {
    suppressed: false,
    ratedMessages: num(raw.ratedMessages),
    raters: num(raw.raters),
    up: num(raw.up),
    down: num(raw.down),
    upShare: num(raw.upShare),
    reasons: arr(raw.reasons).map((row) => {
      const rating = num(row.rating) === 1 ? 1 : -1;
      return {
        key: str(row.key),
        label: feedbackReasonLabel(str(row.key), rating),
        rating,
        count: num(row.count),
      };
    }),
  };
}

export function mapAiInsightsOverview(raw: Raw): AiInsightsOverview {
  const period = rec(raw.period);
  const sample = rec(raw.sample);
  const crisis = rec(raw.crisisLines);
  return {
    period: {
      from: strOrNull(period.from),
      to: strOrNull(period.to),
      bucket: period.bucket === "month" ? "month" : "week",
      requestedFrom: str(period.requestedFrom),
      requestedTo: str(period.requestedTo),
    },
    kThreshold: num(raw.kThreshold),
    sample:
      sample.suppressed === false
        ? {
            suppressed: false,
            users: num(sample.users),
            sessions: num(sample.sessions),
            textSessions: numOrNull(sample.textSessions),
            voiceSessions: numOrNull(sample.voiceSessions),
          }
        : { suppressed: true, users: 0, sessions: 0, textSessions: 0, voiceSessions: 0 },
    topics: counts(raw.topics, AI_INSIGHT_TOPICS),
    topicsSeries: arr(raw.topicsSeries).map((row) => ({
      bucket: str(row.bucket),
      key: str(row.key),
      sessions: num(row.sessions),
    })),
    requestTypes: counts(raw.requestTypes, AI_INSIGHT_REQUEST_TYPES).slice(0, 20),
    concerns: counts(raw.concerns, AI_INSIGHT_CONCERNS),
    resources: arr(raw.resources).map((row) => ({
      resourceId: str(row.resourceId),
      title: str(row.title) || "Untitled resource",
      sessions: num(row.sessions),
      users: num(row.users),
    })),
    crisisLines:
      crisis.suppressed === false
        ? { suppressed: false, sessions: num(crisis.sessions), users: num(crisis.users) }
        : { suppressed: true, sessions: 0, users: 0 },
    feedback: mapFeedback(raw.feedback),
  };
}

export async function fetchAiInsightsOverview(from: string, to: string): Promise<AiInsightsOverview> {
  const raw = await callRpc(
    "admin_ai_insights_overview",
    { p_from: from, p_to: to },
    "Couldn't load AI Insights.",
  );
  return mapAiInsightsOverview(raw);
}

export const topicLabel = (key: string) => taxonomyLabel(AI_INSIGHT_TOPICS, key);
