import { useEffect, useState } from "react";
import { Lightbulb, Star, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  fetchDailyInsightFeed,
  type DailyInsightArticle,
} from "@/lib/dashboard/insightsFeedApi";
import { bubbleStyle } from "@/styles";

const INSIGHT_ICONS = [Lightbulb, TrendingUp, Star] as const;

export default function DashboardInsightsCard() {
  const [articles, setArticles] = useState<DailyInsightArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeArticle, setActiveArticle] = useState<DailyInsightArticle | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchDailyInsightFeed()
      .then((items) => {
        if (!cancelled) setArticles(items);
      })
      .catch(() => {
        if (!cancelled) {
          setArticles([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <section
        data-testid="dashboard-coaching-insights"
        data-style-ref="Group_card_"
        className={cn(
          bubbleStyle("Group_card_"),
          "flex w-full flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6",
        )}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <h2
            data-style-ref="Text_heading_3_"
            className={cn(bubbleStyle("Text_heading_3_"), "text-lg font-semibold text-foreground")}
          >
            Coaching insights
          </h2>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          {loading ? (
            <p className={cn(bubbleStyle("Text_body_"), "text-sm text-muted-foreground")}>
              Loading today&apos;s insights…
            </p>
          ) : error ? (
            <p className={cn(bubbleStyle("Text_body_"), "text-sm text-muted-foreground")}>
              Today&apos;s insights are unavailable right now. Please try again later.
            </p>
          ) : articles.length === 0 ? (
            <p className={cn(bubbleStyle("Text_body_"), "text-sm text-muted-foreground")}>
              Personalized insights will appear here once articles are published for your profile.
            </p>
          ) : (
            articles.map((article, index) => {
              const Icon = INSIGHT_ICONS[index % INSIGHT_ICONS.length];
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => setActiveArticle(article)}
                  className="flex w-full items-center gap-3 rounded-lg bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span
                    className={cn(
                      bubbleStyle("Text_body_"),
                      "min-w-0 flex-1 text-sm leading-snug text-foreground",
                    )}
                  >
                    {article.summary}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <p
          data-style-ref="Text_small_"
          className={cn(bubbleStyle("Text_small_"), "text-xs text-muted-foreground")}
        >
          Insights are coaching observations only, not clinical assessments.
        </p>
      </section>

      <Dialog open={activeArticle !== null} onOpenChange={(open) => !open && setActiveArticle(null)}>
        <DialogContent className="max-w-lg">
          {activeArticle ? (
            <>
              <DialogHeader>
                <DialogTitle>{activeArticle.title}</DialogTitle>
              </DialogHeader>
              <p className="text-sm font-medium text-foreground">{activeArticle.summary}</p>
              <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
                {activeArticle.body || activeArticle.summary}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
