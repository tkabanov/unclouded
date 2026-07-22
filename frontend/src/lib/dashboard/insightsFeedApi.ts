import { supabase } from "@/integrations/supabase/client";

export interface DailyInsightArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
}

type UntypedSupabase = {
  rpc: (
    fn: string,
    args?: Record<string, never>,
  ) => ReturnType<typeof supabase.rpc>;
};

function mapDailyInsightArticle(row: Record<string, unknown>): DailyInsightArticle | null {
  const id = typeof row.id === "string" ? row.id : null;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const summary = typeof row.summary === "string" ? row.summary.trim() : "";
  const body = typeof row.body === "string" ? row.body.trim() : "";
  if (!id || !title || !summary) return null;
  return { id, title, summary, body };
}

export async function fetchDailyInsightFeed(): Promise<DailyInsightArticle[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client.rpc("get_my_daily_insight_feed");

  if (error) throw error;
  if (!Array.isArray(data)) return [];

  return data
    .map((row) =>
      row && typeof row === "object" ? mapDailyInsightArticle(row as Record<string, unknown>) : null,
    )
    .filter((item): item is DailyInsightArticle => item !== null);
}
