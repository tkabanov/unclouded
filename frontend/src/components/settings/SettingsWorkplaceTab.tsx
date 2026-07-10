import { useCallback, useEffect, useState } from "react";
import { Building2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emptyWorkplaceForm,
  linkWorkplace,
  loadWorkplaceLink,
  WORKPLACE_CARD_SUBTITLE,
  WORKPLACE_CARD_TITLE,
  WORKPLACE_EMAIL_LABEL,
  WORKPLACE_EMAIL_PLACEHOLDER,
  WORKPLACE_LINK_BTN_LABEL,
  WORKPLACE_NAME_LABEL,
  WORKPLACE_NAME_PLACEHOLDER,
  WORKPLACE_PRIVACY_TEXT,
  type WorkplaceFormState,
} from "@/lib/settings/workplaceApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function SettingsWorkplaceTab() {
  const { user } = useAuth();
  const [form, setForm] = useState<WorkplaceFormState>(emptyWorkplaceForm());
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
      <div className="text-sm text-muted-foreground">
        Loading workplace…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-6 p-6")}
      >
        <header className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className={bubbleStyle("Text_heading_2_")}>
              {WORKPLACE_CARD_TITLE}
            </h2>
            <p
              className={cn(bubbleStyle("Text_small_"), "text-sm")}
            >
              {WORKPLACE_CARD_SUBTITLE}
            </p>
          </div>
        </header>

        <div
          className="flex gap-3 rounded-lg border border-border bg-muted/40 p-4"
        >
          <span className="shrink-0 text-primary">
            <Shield className="mt-0.5 h-4 w-4" />
          </span>
          <p
            className="text-sm text-muted-foreground"
          >
            {WORKPLACE_PRIVACY_TEXT}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="workplace-name"
                className={bubbleStyle("Text_label_")}
              >
                {WORKPLACE_NAME_LABEL}
              </Label>
              <Input
                id="workplace-name"
                className={bubbleStyle("Input_default_")}
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder={WORKPLACE_NAME_PLACEHOLDER}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="workplace-email"
                className={bubbleStyle("Text_label_")}
              >
                {WORKPLACE_EMAIL_LABEL}
              </Label>
              <Input
                id="workplace-email"
                type="email"
                className={bubbleStyle("Input_default_")}
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder={WORKPLACE_EMAIL_PLACEHOLDER}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              className={bubbleStyle("Button_primary_")}
              disabled={linking}
              onClick={() => void handleLink()}
            >
              {linking ? "Linking…" : WORKPLACE_LINK_BTN_LABEL}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
