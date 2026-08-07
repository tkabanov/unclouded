import { supabase } from "@/integrations/supabase/client";

export type KotaDailyInsightItem = {
  id: string;
  insightDate: string;
  insights: Array<{ title: string; body: string }>;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

/**
 * Last 7 days of Kota daily messages for the signed-in user.
 */
export async function fetchKotaDailyInsightsFeed(): Promise<KotaDailyInsightItem[]> {
  const client = supabase as unknown as UntypedSupabase;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 6);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data, error } = await client
    .from("dailyInsight")
    .select(
      "id, insightDate, insight1Title, insight1Body, insight2Title, insight2Body, insight3Title, insight3Body",
    )
    .gte("insightDate", sinceDate)
    .order("insightDate", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      insightDate: String(r.insightDate),
      insights: [
        {
          title: String(r.insight1Title ?? ""),
          body: String(r.insight1Body ?? ""),
        },
        {
          title: String(r.insight2Title ?? ""),
          body: String(r.insight2Body ?? ""),
        },
        {
          title: String(r.insight3Title ?? ""),
          body: String(r.insight3Body ?? ""),
        },
      ].filter((i) => i.title.trim() && i.body.trim()),
    };
  });
}
