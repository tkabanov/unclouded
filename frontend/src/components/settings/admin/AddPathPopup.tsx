import { useEffect, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import AdminPathSessionFields from "@/components/settings/admin/AdminPathSessionFields";
import {
  AI_COACHING_MODE_ORDER,
  AI_COACHING_MODE_LABELS,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { TIER_ORDER } from "@/lib/enums/tier";
import { getTierSubscriptionLabel } from "@/lib/enums/subscription";
import {
  SENSITIVITY_OPTIONS,
  type AdminPathFormState,
  emptyAdminPathForm,
} from "@/lib/settings/admin/adminPathsApi";
import {
  emptyAdminPathSessionDraft,
  type AdminPathSessionDraft,
} from "@/lib/settings/admin/adminPathSessionsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export interface AddPathPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AdminPathFormState, sessions: AdminPathSessionDraft[]) => Promise<void>;
  busy?: boolean;
  editPathId?: string | null;
  initialForm?: AdminPathFormState | null;
  initialSessions?: AdminPathSessionDraft[] | null;
}

export default function AddPathPopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  editPathId = null,
  initialForm = null,
  initialSessions = null,
}: AddPathPopupProps) {
  const [form, setForm] = useState<AdminPathFormState>(emptyAdminPathForm());
  const [sessions, setSessions] = useState<AdminPathSessionDraft[]>([]);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const isEdit = Boolean(editPathId);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm ?? emptyAdminPathForm());
    const nextSessions = initialSessions ?? [];
    setSessions(nextSessions);
    setOpenKeys(new Set(nextSessions[0] ? [nextSessions[0].clientKey] : []));
    // Reset only when the dialog opens; parent may recreate initial* object identities each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open]);

  const updateSession = (clientKey: string, next: AdminPathSessionDraft) => {
    setSessions((prev) => prev.map((s) => (s.clientKey === clientKey ? next : s)));
  };

  const addModule = () => {
    const draft = emptyAdminPathSessionDraft();
    setSessions((prev) => [...prev, draft]);
    setOpenKeys((prev) => new Set(prev).add(draft.clientKey));
  };

  const removeModule = (clientKey: string) => {
    setSessions((prev) => prev.filter((s) => s.clientKey !== clientKey));
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.delete(clientKey);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit guided path" : "Add guided path"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="add-path-title">Title</Label>
            <Input
              id="add-path-title"
              className={bubbleStyle("Input_default_")}
              value={form.name}
              disabled={busy}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-path-tier">Tier</Label>
            <Select
              value={form.tier}
              disabled={busy}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, tier: value as AdminPathFormState["tier"] }))
              }
            >
              <SelectTrigger
                id="add-path-tier"
                className={bubbleStyle("Input_default_")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIER_ORDER.map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {getTierSubscriptionLabel(tier)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-path-mode">Primary coaching mode</Label>
            <Select
              value={form.coachingMode}
              disabled={busy}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  coachingMode: value as AiCoachingModeSlug,
                }))
              }
            >
              <SelectTrigger id="add-path-mode" className={bubbleStyle("Input_default_")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_COACHING_MODE_ORDER.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {AI_COACHING_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-path-submode">Sub-mode tag</Label>
            <Input
              id="add-path-submode"
              value={form.subMode}
              disabled={busy}
              onChange={(event) => setForm((prev) => ({ ...prev, subMode: event.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-path-sensitivity">Sensitivity</Label>
            <Select
              value={form.sensitivity}
              disabled={busy}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  sensitivity: value as AdminPathFormState["sensitivity"],
                }))
              }
            >
              <SelectTrigger id="add-path-sensitivity" className={bubbleStyle("Input_default_")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENSITIVITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-path-desc">Description</Label>
            <Textarea
              id="add-path-desc"
              rows={4}
              value={form.description}
              disabled={busy}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Modules</h3>
                <p className="text-xs text-muted-foreground">
                  {sessions.length} session module(s) — saved with the path.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={addModule}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add module
              </Button>
            </div>

            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No modules yet. Add the first session for this path.
              </p>
            ) : (
              <div className="grid gap-2">
                {sessions.map((session, index) => {
                  const isOpen = openKeys.has(session.clientKey);
                  return (
                    <Collapsible
                      key={session.clientKey}
                      open={isOpen}
                      onOpenChange={(nextOpen) => {
                        setOpenKeys((prev) => {
                          const next = new Set(prev);
                          if (nextOpen) next.add(session.clientKey);
                          else next.delete(session.clientKey);
                          return next;
                        });
                      }}
                    >
                      <div className="rounded-lg border border-border">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 flex-1 justify-start gap-2 px-2"
                              disabled={busy}
                            >
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 shrink-0 transition-transform",
                                  isOpen ? "rotate-0" : "-rotate-90",
                                )}
                              />
                              <span className="truncate text-left text-sm font-medium">
                                Module {index + 1}
                                {session.title.trim() ? ` — ${session.title.trim()}` : ""}
                              </span>
                            </Button>
                          </CollapsibleTrigger>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            title="Remove module"
                            onClick={() => removeModule(session.clientKey)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <CollapsibleContent>
                          <div className="border-t border-border px-3 py-3">
                            <AdminPathSessionFields
                              idPrefix={`path-module-${session.clientKey}`}
                              value={session}
                              disabled={busy}
                              onChange={(next) =>
                                updateSession(session.clientKey, {
                                  ...session,
                                  ...next,
                                })
                              }
                            />
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={bubbleStyle("Button_primary_")}
            disabled={busy}
            onClick={() => void onSubmit(form, sessions)}
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create path"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
