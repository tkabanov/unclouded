import { useEffect, useState } from "react";
import {
  fetchKotaDailyInsightsFeed,
  type KotaDailyInsightItem,
} from "@/lib/dashboard/kotaDailyInsightsApi";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { canUseJournalAiReflection } from "@/lib/journal/journalEntitlements";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export default function DashboardKotaMessagesCard() {
  const tier = useEffectiveTier().tier;
  const enabled = canUseJournalAiReflection(tier);
  const [items, setItems] = useState<KotaDailyInsightItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void fetchKotaDailyInsightsFeed()
      .then((feed) => {
        if (!cancelled) {
          setItems(feed);
          if (feed[0]) setExpandedId(feed[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) return null;

  const today = items[0];

  return (
    <section
      className={cn(
        bubbleStyle("Group_card_"),
        "flex w-full flex-col gap-3 rounded-lg border border-border/60 bg-card p-4",
      )}
      data-testid="dashboard-kota-messages"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold")}>
          From Kota
        </h2>
        <span className="text-xs text-muted-foreground">Kota&apos;s Messages</span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading today&apos;s insights…</p>
      ) : !today ? (
        <p className="text-sm text-muted-foreground">
          Kota will leave you a message here each day.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {today.insights.map((insight, index) => (
            <article key={`${today.id}-${index}`} className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">{insight.title}</h3>
              <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-muted-foreground">
                {insight.body}
              </p>
            </article>
          ))}

          {items.length > 1 ? (
            <div className="border-t border-border/40 pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last 7 days
              </p>
              <ul className="flex flex-col gap-1">
                {items.slice(1).map((day) => (
                  <li key={day.id}>
                    <button
                      type="button"
                      className="text-left text-sm text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() =>
                        setExpandedId((current) => (current === day.id ? null : day.id))
                      }
                    >
                      {day.insightDate}
                      {expandedId === day.id ? " — hide" : " — view"}
                    </button>
                    {expandedId === day.id ? (
                      <div className="mt-2 space-y-2 pl-2">
                        {day.insights.map((insight, index) => (
                          <div key={`${day.id}-exp-${index}`}>
                            <p className="text-sm font-medium">{insight.title}</p>
                            <p className="whitespace-pre-wrap text-sm italic text-muted-foreground">
                              {insight.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
