import { useEffect, useState } from "react";
import { BookOpen, Lightbulb, TrendingUp } from "lucide-react";
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

const INSIGHT_ICONS = [Lightbulb, TrendingUp, BookOpen] as const;

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
      <div
        data-style-ref="Group_card_"
        className={cn(bubbleStyle("Group_card_"), "flex w-full flex-col gap-4 p-5")}
      >
        <div className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}>
          <TrendingUp
            className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 shrink-0")}
            aria-hidden
          />
          <h2
            data-style-ref="Text_heading_3_"
            className={cn(bubbleStyle("Text_heading_3_"), "text-lg")}
          >
            Coaching Insights
          </h2>
        </div>

        <div className={cn(bubbleStyle("Group_transparent_"), "flex w-full flex-col gap-2")}>
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
                  className={cn(
                    bubbleStyle("Group_transparent_"),
                    "flex w-full items-start gap-3 rounded-lg bg-accent/30 p-3 text-left transition-colors hover:bg-accent/45",
                  )}
                >
                  <Icon
                    className={cn(bubbleStyle("Icon_primary_"), "mt-0.5 h-4 w-4 shrink-0")}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        bubbleStyle("Text_body_"),
                        "block text-sm font-medium text-foreground",
                      )}
                    >
                      {article.title}
                    </span>
                    <span
                      className={cn(
                        bubbleStyle("Text_body_"),
                        "mt-1 block text-sm text-muted-foreground",
                      )}
                    >
                      {article.summary}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <p
          data-style-ref="Text_small_"
          className={cn(bubbleStyle("Text_small_"), "text-[11px] text-muted-foreground")}
        >
          Insights are educational coaching content only, not clinical assessments. Refreshes daily.
        </p>
      </div>

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
