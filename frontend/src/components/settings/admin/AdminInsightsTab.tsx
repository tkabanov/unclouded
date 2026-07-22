import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AddInsightArticlePopup from "@/components/settings/admin/AddInsightArticlePopup";
import {
  adminInsightArticleToForm,
  createAdminInsightArticle,
  deleteAdminInsightArticle,
  fetchAdminInsightArticles,
  updateAdminInsightArticle,
  type AdminInsightArticleRecord,
} from "@/lib/settings/admin/adminInsightsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatTags(article: AdminInsightArticleRecord): string {
  const tags = [
    article.classificationKey,
    article.primaryPillar,
    article.nervousSystem,
  ].filter(Boolean);
  return tags.length > 0 ? tags.join(" · ") : "Any profile";
}

export default function AdminInsightsTab() {
  const [articles, setArticles] = useState<AdminInsightArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<AdminInsightArticleRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const popupOpen = addOpen || editArticle !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditArticle(null);
  }, []);

  const reload = useCallback(async () => {
    const result = await fetchAdminInsightArticles();
    setArticles(result);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load insight articles.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleSave = useCallback(
    async (form: Parameters<typeof createAdminInsightArticle>[0]) => {
      if (busy) return;
      setBusy(true);
      try {
        if (editArticle) {
          await updateAdminInsightArticle(editArticle.articleId, form);
          toast.success("Insight article updated.");
        } else {
          await createAdminInsightArticle(form);
          toast.success("Insight article created.");
        }
        await reload();
        closePopup();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save insight article.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, closePopup, editArticle, reload],
  );

  const handleDelete = useCallback(
    async (article: AdminInsightArticleRecord) => {
      if (busy) return;
      setBusy(true);
      try {
        await deleteAdminInsightArticle(article.articleId);
        await reload();
        toast.success("Insight article deleted.");
      } catch {
        toast.error("Couldn't delete insight article.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload],
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading insight articles…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={bubbleStyle("Text_heading_3_")}>Insights feed</h3>
          <p className="text-sm text-muted-foreground">
            Publish tagged articles for the dashboard Coaching Insights card (3 per user per day).
          </p>
        </div>
        <Button
          type="button"
          className={bubbleStyle("Button_primary_")}
          onClick={() => setAddOpen(true)}
        >
          Add article
        </Button>
      </div>

      {articles.length === 0 ? (
        <div className={cn(bubbleStyle("Group_card_muted_"), "p-4 text-sm text-muted-foreground")}>
          No insight articles yet. Seed content ships with the migration; add or publish articles here.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {articles.map((article) => (
            <div
              key={article.articleId}
              className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={bubbleStyle("Text_heading_3_")}>{article.title}</h4>
                    <Badge variant={article.published ? "default" : "secondary"}>
                      {article.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{article.summary}</p>
                  <p className="text-xs text-muted-foreground">Tags: {formatTags(article)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${article.title}`}
                    onClick={() => setEditArticle(article)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${article.title}`}
                    onClick={() => void handleDelete(article)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddInsightArticlePopup
        open={popupOpen}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editArticleId={editArticle?.articleId ?? null}
        initialForm={editArticle ? adminInsightArticleToForm(editArticle) : null}
      />
    </div>
  );
}
