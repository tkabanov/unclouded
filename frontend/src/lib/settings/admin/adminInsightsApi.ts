import { supabase } from "@/integrations/supabase/client";
import { classifications } from "@/lib/classification";
import { CUSTOMER_PILLAR_ORDER, CUSTOMER_PILLAR_LABELS } from "@/lib/enums/customerProfile";
import {
  STATE_NERVOUS_SYSTEM_ORDER,
  STATE_NERVOUS_SYSTEM_LABELS,
} from "@/lib/enums/wellnessState";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export const INSIGHT_CLASSIFICATION_OPTIONS = Object.values(classifications).map((item) => ({
  value: item.key,
  label: item.name,
}));

export const INSIGHT_PILLAR_OPTIONS = CUSTOMER_PILLAR_ORDER.map((value) => ({
  value,
  label: CUSTOMER_PILLAR_LABELS[value],
}));

export const INSIGHT_NERVOUS_SYSTEM_OPTIONS = STATE_NERVOUS_SYSTEM_ORDER.map((value) => ({
  value,
  label: STATE_NERVOUS_SYSTEM_LABELS[value],
}));

export interface AdminInsightArticleRecord {
  articleId: string;
  title: string;
  summary: string;
  body: string;
  classificationKey: string | null;
  primaryPillar: string | null;
  nervousSystem: string | null;
  published: boolean;
}

export type AdminInsightArticleFormState = Omit<AdminInsightArticleRecord, "articleId">;

type InsightArticleRow = {
  id?: string;
  title?: string;
  summary?: string;
  body?: string;
  classificationKey?: string | null;
  primaryPillar?: string | null;
  nervousSystem?: string | null;
  published?: boolean | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function normalizeOptionalTag(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toAdminInsightArticle(row: InsightArticleRow): AdminInsightArticleRecord | null {
  if (!row.id) return null;
  const title = row.title?.trim();
  const summary = row.summary?.trim();
  if (!title || !summary) return null;

  return {
    articleId: row.id,
    title,
    summary,
    body: row.body?.trim() ?? "",
    classificationKey: normalizeOptionalTag(row.classificationKey),
    primaryPillar: normalizeOptionalTag(row.primaryPillar),
    nervousSystem: normalizeOptionalTag(row.nervousSystem),
    published: row.published ?? false,
  };
}

export function emptyAdminInsightArticleForm(): AdminInsightArticleFormState {
  return {
    title: "",
    summary: "",
    body: "",
    classificationKey: null,
    primaryPillar: null,
    nervousSystem: null,
    published: false,
  };
}

export async function fetchAdminInsightArticles(): Promise<AdminInsightArticleRecord[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("coachingInsightArticle")
    .select(
      "id, title, summary, body, classificationKey, primaryPillar, nervousSystem, published",
    )
    .order("createdAt", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => toAdminInsightArticle(row as InsightArticleRow))
    .filter((item): item is AdminInsightArticleRecord => item !== null);
}

function insightRowFromForm(form: AdminInsightArticleFormState, articleId: string): InsightArticleRow {
  const title = form.title.trim();
  const summary = form.summary.trim();
  if (!title) throw new Error("Article title is required.");
  if (!summary) throw new Error("Article summary is required.");

  return {
    id: articleId,
    title,
    summary,
    body: form.body.trim(),
    classificationKey: normalizeOptionalTag(form.classificationKey),
    primaryPillar: normalizeOptionalTag(form.primaryPillar),
    nervousSystem: normalizeOptionalTag(form.nervousSystem),
    published: form.published,
  };
}

export async function createAdminInsightArticle(
  form: AdminInsightArticleFormState,
): Promise<AdminInsightArticleRecord> {
  const row = insightRowFromForm(form, crypto.randomUUID());
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client.from("coachingInsightArticle").insert(row as never);
  if (error) throw error;

  const created = toAdminInsightArticle(row);
  if (!created) throw new Error("Failed to create insight article.");
  return created;
}

export async function updateAdminInsightArticle(
  articleId: string,
  form: AdminInsightArticleFormState,
): Promise<void> {
  const row = insightRowFromForm(form, articleId);
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("coachingInsightArticle")
    .update({
      title: row.title,
      summary: row.summary,
      body: row.body,
      classificationKey: row.classificationKey,
      primaryPillar: row.primaryPillar,
      nervousSystem: row.nervousSystem,
      published: row.published,
    } as never)
    .eq("id", articleId);

  if (error) throw error;
}

export async function deleteAdminInsightArticle(articleId: string): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client.from("coachingInsightArticle").delete().eq("id", articleId);
  if (error) throw error;
}

export function adminInsightArticleToForm(
  article: AdminInsightArticleRecord,
): AdminInsightArticleFormState {
  return {
    title: article.title,
    summary: article.summary,
    body: article.body,
    classificationKey: article.classificationKey,
    primaryPillar: article.primaryPillar,
    nervousSystem: article.nervousSystem,
    published: article.published,
  };
}
