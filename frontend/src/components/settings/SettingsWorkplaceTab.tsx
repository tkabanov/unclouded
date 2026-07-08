import { useCallback, useEffect, useState } from "react";
import { Building2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WORKPLACE_CARD_HEADER_BUBBLE_ID,
  WORKPLACE_CARD_SUBTITLE_BUBBLE_ID,
  WORKPLACE_CARD_TITLE_BUBBLE_ID,
  WORKPLACE_EMAIL_GROUP_BUBBLE_ID,
  WORKPLACE_EMAIL_INPUT_BUBBLE_ID,
  WORKPLACE_EMAIL_LABEL_BUBBLE_ID,
  WORKPLACE_FORM_BUBBLE_ID,
  WORKPLACE_INFO_CARD_BUBBLE_ID,
  WORKPLACE_LINK_BTN_BUBBLE_ID,
  WORKPLACE_NAME_GROUP_BUBBLE_ID,
  WORKPLACE_NAME_INPUT_BUBBLE_ID,
  WORKPLACE_NAME_LABEL_BUBBLE_ID,
  WORKPLACE_PANEL_BUBBLE_ID,
  WORKPLACE_PRIVACY_ICON_BUBBLE_ID,
  WORKPLACE_PRIVACY_NOTICE_BUBBLE_ID,
  WORKPLACE_PRIVACY_TEXT_BUBBLE_ID,
} from "@/lib/settings/routes";
import {
  emptyWorkplaceForm,
  linkWorkplace,
  loadWorkplaceLink,
  type WorkplaceFormState,
} from "@/lib/settings/workplaceApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function SettingsWorkplaceTab() {
  const { user } = useAuth();
  const [form, setForm] = useState<WorkplaceFormState>(emptyWorkplaceForm());
  const [linkedAt, setLinkedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    loadWorkplaceLink(user.id)
      .then((state) => {
        if (!cancelled) {
          setForm({ name: state.name, email: state.email });
          setLinkedAt(state.linkedAt);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load workplace settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateField = useCallback(
    <K extends keyof WorkplaceFormState>(key: K, value: WorkplaceFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleLink = useCallback(async () => {
    if (!user || linking) return;
    setLinking(true);
    try {
      await linkWorkplace(user.id, form);
      const refreshed = await loadWorkplaceLink(user.id);
      setForm({ name: refreshed.name, email: refreshed.email });
      setLinkedAt(refreshed.linkedAt);
      toast.success("Workplace linked successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't link your workplace.";
      toast.error(message);
    } finally {
      setLinking(false);
    }
  }, [form, linking, user]);

  if (loading) {
    return (
      <div data-bubble-id={WORKPLACE_PANEL_BUBBLE_ID} className="text-sm text-muted-foreground">
        Loading workplace…
      </div>
    );
  }

  return (
    <div data-bubble-id={WORKPLACE_PANEL_BUBBLE_ID} className="flex flex-col gap-6">
      <div
        data-bubble-id={WORKPLACE_INFO_CARD_BUBBLE_ID}
        className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-6 p-6")}
      >
        <header data-bubble-id={WORKPLACE_CARD_HEADER_BUBBLE_ID} className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 data-bubble-id={WORKPLACE_CARD_TITLE_BUBBLE_ID} className={bubbleStyle("Text_heading_2_")}>
              Workplace benefits
            </h2>
            <p
              data-bubble-id={WORKPLACE_CARD_SUBTITLE_BUBBLE_ID}
              className={cn(bubbleStyle("Text_small_"), "text-sm")}
            >
              Link your employer to unlock team coaching programs and aggregated insights.
            </p>
          </div>
        </header>

        <div
          data-bubble-id={WORKPLACE_PRIVACY_NOTICE_BUBBLE_ID}
          className="flex gap-3 rounded-lg border border-border bg-muted/40 p-4"
        >
          <span data-bubble-id={WORKPLACE_PRIVACY_ICON_BUBBLE_ID} className="shrink-0 text-primary">
            <Shield className="mt-0.5 h-4 w-4" />
          </span>
          <p
            data-bubble-id={WORKPLACE_PRIVACY_TEXT_BUBBLE_ID}
            className="text-sm text-muted-foreground"
          >
            Your employer only receives aggregated, anonymized wellness trends — never individual
            journal entries, chat transcripts, or personal health details.
          </p>
        </div>

        <div data-bubble-id={WORKPLACE_FORM_BUBBLE_ID} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div data-bubble-id={WORKPLACE_NAME_GROUP_BUBBLE_ID} className="flex flex-col gap-2">
              <Label
                htmlFor="workplace-name"
                data-bubble-id={WORKPLACE_NAME_LABEL_BUBBLE_ID}
                className={bubbleStyle("Text_label_")}
              >
                Workplace name
              </Label>
            <Input
              id="workplace-name"
              data-bubble-id={WORKPLACE_NAME_INPUT_BUBBLE_ID}
              className={bubbleStyle("Input_default_")}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Acme Corp"
            />
          </div>

            <div data-bubble-id={WORKPLACE_EMAIL_GROUP_BUBBLE_ID} className="flex flex-col gap-2">
              <Label
                htmlFor="workplace-email"
                data-bubble-id={WORKPLACE_EMAIL_LABEL_BUBBLE_ID}
                className={bubbleStyle("Text_label_")}
              >
                HR / benefits contact email
              </Label>
            <Input
              id="workplace-email"
              type="email"
              data-bubble-id={WORKPLACE_EMAIL_INPUT_BUBBLE_ID}
              className={bubbleStyle("Input_default_")}
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="benefits@company.com"
            />
            </div>
          </div>

          {linkedAt && (
            <p className="text-xs text-muted-foreground">
              Linked on {new Date(linkedAt).toLocaleDateString()}.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              data-bubble-id={WORKPLACE_LINK_BTN_BUBBLE_ID}
              className={bubbleStyle("Button_primary_")}
              disabled={linking}
              onClick={() => void handleLink()}
            >
              {linking ? "Linking…" : linkedAt ? "Update workplace link" : "Link workplace"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
