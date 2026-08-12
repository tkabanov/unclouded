import { useEffect, useState } from "react";
import {
  fetchKotaDailyInsightsFeed,
  type KotaDailyInsightItem,
} from "@/lib/dashboard/kotaDailyInsightsApi";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { canUseJournalAiReflection } from "@/lib/journal/journalEntitlements";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function DashboardKotaMessagesCard() {
  const tier = useEffectiveTier().tier;
  const enabled = canUseJournalAiReflection(tier);
  const [items, setItems] = useState<KotaDailyInsightItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void fetchKotaDailyInsightsFeed()
      .then((feed) => {
        if (!cancelled) {
          setItems(feed);
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

  const latestMessage = today?.insights[0]?.body ?? null;

  return (
    <section
      className={cn(
        bubbleStyle("Group_card_"),
        "flex w-full flex-col gap-3 rounded-lg border border-border/60 bg-card p-4",
      )}
      data-testid="dashboard-kota-messages"
    >
      {/* Header row: avatar + text + button */}
      <div className="flex items-center gap-3">
        {/* Kota avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/30">
          <img
            src="/kota-avatar.png"
            alt="Kota coach"
            className="h-9 w-9 rounded-full object-cover"
          />
        </div>

        {/* Title + subtitle */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-sm font-semibold leading-tight")}>
            From your coach
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {loading
              ? "Loading today's message…"
              : latestMessage
              ? latestMessage
              : "Your output is real. Let's make it sustainable."}
          </p>
        </div>

        {/* Messages button */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => {
            setMessagesOpen((open) => {
              const next = !open;
              if (!next) setExpandedDayId(null);
              return next;
            });
          }}
          disabled={loading || !today}
        >
          <Mail className="h-3.5 w-3.5" />
          Messages
        </Button>
      </div>

      {/* Expanded content */}
      {messagesOpen && today && (
        <div className="flex flex-col gap-3 border-t border-border/40 pt-3">
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
                        setExpandedDayId((current) => (current === day.id ? null : day.id))
                      }
                    >
                      {day.insightDate}
                      {expandedDayId === day.id ? " — hide" : " — view"}
                    </button>
                    {expandedDayId === day.id ? (
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
