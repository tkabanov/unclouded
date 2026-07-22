import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  emptyAdminInsightArticleForm,
  INSIGHT_CLASSIFICATION_OPTIONS,
  INSIGHT_NERVOUS_SYSTEM_OPTIONS,
  INSIGHT_PILLAR_OPTIONS,
  type AdminInsightArticleFormState,
} from "@/lib/settings/admin/adminInsightsApi";
import { bubbleStyle } from "@/styles";

const ANY_TAG_VALUE = "__any__";

export interface AddInsightArticlePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AdminInsightArticleFormState) => Promise<void>;
  busy?: boolean;
  editArticleId?: string | null;
  initialForm?: AdminInsightArticleFormState | null;
}

export default function AddInsightArticlePopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  editArticleId = null,
  initialForm = null,
}: AddInsightArticlePopupProps) {
  const [form, setForm] = useState<AdminInsightArticleFormState>(emptyAdminInsightArticleForm());
  const isEdit = Boolean(editArticleId);

  useEffect(() => {
    if (open) setForm(initialForm ?? emptyAdminInsightArticleForm());
  }, [open, initialForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit insight article" : "Add insight article"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="insight-title">Title</Label>
            <Input
              id="insight-title"
              className={bubbleStyle("Input_default_")}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="insight-summary">Summary</Label>
            <Textarea
              id="insight-summary"
              rows={2}
              value={form.summary}
              onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="insight-body">Body</Label>
            <Textarea
              id="insight-body"
              rows={6}
              value={form.body}
              onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="insight-classification">Classification tag</Label>
            <Select
              value={form.classificationKey ?? ANY_TAG_VALUE}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  classificationKey: value === ANY_TAG_VALUE ? null : value,
                }))
              }
            >
              <SelectTrigger id="insight-classification" className={bubbleStyle("Input_default_")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_TAG_VALUE}>Any classification</SelectItem>
                {INSIGHT_CLASSIFICATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="insight-pillar">Primary pillar tag</Label>
            <Select
              value={form.primaryPillar ?? ANY_TAG_VALUE}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  primaryPillar: value === ANY_TAG_VALUE ? null : value,
                }))
              }
            >
              <SelectTrigger id="insight-pillar" className={bubbleStyle("Input_default_")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_TAG_VALUE}>Any pillar</SelectItem>
                {INSIGHT_PILLAR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="insight-nervous-system">Nervous system tag</Label>
            <Select
              value={form.nervousSystem ?? ANY_TAG_VALUE}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  nervousSystem: value === ANY_TAG_VALUE ? null : value,
                }))
              }
            >
              <SelectTrigger id="insight-nervous-system" className={bubbleStyle("Input_default_")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_TAG_VALUE}>Any nervous system state</SelectItem>
                {INSIGHT_NERVOUS_SYSTEM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label htmlFor="insight-published">Published</Label>
              <p className="text-xs text-muted-foreground">
                Published articles can appear in user feeds when tags match.
              </p>
            </div>
            <Switch
              id="insight-published"
              checked={form.published}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, published: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            className={bubbleStyle("Button_primary_")}
            disabled={busy}
            onClick={() => void onSubmit(form)}
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create article"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
