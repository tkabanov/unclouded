import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  AI_SETTINGS_LIMITS,
  fetchPlatformAiSettings,
  friendlyErrorMessage,
  savePlatformAiSettings,
  type PlatformAiSettingsPatch,
  type PlatformAiSettingsRecord,
} from "@/lib/settings/admin/adminAiSettingsApi";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

type FieldKey = "globalSystemPrompt" | "prohibitedTopics" | "toneOfVoice";

function sameTopics(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((topic, index) => topic === b[index]);
}

function SettingCard({
  title,
  description,
  dirty,
  children,
}: {
  title: string;
  description: string;
  dirty: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {dirty && <Badge variant="outline">Unsaved changes</Badge>}
      </div>
      {children}
    </section>
  );
}

function CharCounter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={cn("text-xs", over ? "text-destructive" : "text-muted-foreground")}>
      {value.length.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}

export default function AdminAiSettingsTab() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<PlatformAiSettingsRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [tone, setTone] = useState("");
  const [busy, setBusy] = useState<Record<FieldKey, boolean>>({
    globalSystemPrompt: false,
    prohibitedTopics: false,
    toneOfVoice: false,
  });
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPlatformAiSettings()
      .then((record) => {
        if (cancelled) return;
        setSaved(record);
        setGlobalPrompt(record.globalSystemPrompt);
        setTopics(record.prohibitedTopics);
        setTone(record.toneOfVoice);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(friendlyErrorMessage(err instanceof Error ? err.message : undefined, "Couldn't load AI settings."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(
    async (field: FieldKey, patch: PlatformAiSettingsPatch, successMessage: string) => {
      if (!user) return;
      setBusy((prev) => ({ ...prev, [field]: true }));
      try {
        const record = await savePlatformAiSettings(patch);
        // Re-read the confirmed value so unsaved text is never shown as applied.
        setSaved((prev) => (prev ? { ...prev, [field]: record[field], updatedAt: record.updatedAt } : record));
        if (field === "globalSystemPrompt") setGlobalPrompt(record.globalSystemPrompt);
        if (field === "prohibitedTopics") setTopics(record.prohibitedTopics);
        if (field === "toneOfVoice") setTone(record.toneOfVoice);
        toast.success(successMessage);
      } catch (err) {
        toast.error(friendlyErrorMessage(err instanceof Error ? err.message : undefined, "Couldn't save AI settings."));
      } finally {
        setBusy((prev) => ({ ...prev, [field]: false }));
      }
    },
    [user],
  );

  if (loadError) {
    return <div className="text-sm text-destructive">{loadError}</div>;
  }

  if (!saved) {
    return <div className="text-sm text-muted-foreground">Loading AI settings…</div>;
  }

  const promptDirty = globalPrompt.trim() !== saved.globalSystemPrompt;
  const topicsDirty = !sameTopics(topics, saved.prohibitedTopics);
  const toneDirty = tone.trim() !== saved.toneOfVoice;
  const promptTooLong = globalPrompt.length > AI_SETTINGS_LIMITS.globalSystemPrompt;
  const toneTooLong = tone.length > AI_SETTINGS_LIMITS.toneOfVoice;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className={bubbleStyle("Text_heading_3_")}>AI Settings · Prompts</h3>
        <p className="text-sm text-muted-foreground">
          Changes apply to new AI replies within ~1 minute. Crisis safety protocol cannot be
          overridden.
        </p>
        <p className="text-xs text-muted-foreground">
          These instructions shape what users see in AI replies, so never put secrets or internal
          notes here.
        </p>
      </div>

      <SettingCard
        title="Global system prompt"
        description="Platform-wide instructions for text and voice AI. Applied right after safety rules."
        dirty={promptDirty}
      >
        <Textarea
          value={globalPrompt}
          onChange={(event) => setGlobalPrompt(event.target.value)}
          rows={8}
          disabled={busy.globalSystemPrompt}
          aria-label="Global system prompt"
          placeholder="e.g. Always answer in English. Never recommend specific products."
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CharCounter value={globalPrompt} max={AI_SETTINGS_LIMITS.globalSystemPrompt} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy.globalSystemPrompt || (!saved.globalSystemPrompt && !globalPrompt)}
              onClick={() => {
                // Nothing applied yet: just discard the local text.
                if (!saved.globalSystemPrompt) setGlobalPrompt("");
                else setConfirmClearOpen(true);
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy.globalSystemPrompt || !promptDirty || promptTooLong}
              onClick={() =>
                void save(
                  "globalSystemPrompt",
                  { globalSystemPrompt: globalPrompt },
                  "Global system prompt saved.",
                )
              }
            >
              {busy.globalSystemPrompt ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </SettingCard>

      <SettingCard
        title="Prohibited topics"
        description="The AI gently declines and redirects when these come up. Press Enter to add; click a topic to edit, × to remove."
        dirty={topicsDirty}
      >
        <TagInput
          value={topics}
          onChange={setTopics}
          disabled={busy.prohibitedTopics}
          maxTags={AI_SETTINGS_LIMITS.topicCount}
          maxTagLength={AI_SETTINGS_LIMITS.topicLength}
          placeholder="Type a topic and press Enter"
          aria-label="Prohibited topics"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {topics.length} / {AI_SETTINGS_LIMITS.topicCount}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={busy.prohibitedTopics || !topicsDirty}
            onClick={() =>
              void save("prohibitedTopics", { prohibitedTopics: topics }, "Prohibited topics saved.")
            }
          >
            {busy.prohibitedTopics ? "Saving…" : "Save"}
          </Button>
        </div>
      </SettingCard>

      <SettingCard
        title="Tone of voice"
        description="Style only. Never overrides safety rules, the global prompt or prohibited topics."
        dirty={toneDirty}
      >
        <Textarea
          value={tone}
          onChange={(event) => setTone(event.target.value)}
          rows={4}
          disabled={busy.toneOfVoice}
          aria-label="Tone of voice"
          placeholder="e.g. Warm, calm and concise. Plain language, no jargon."
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CharCounter value={tone} max={AI_SETTINGS_LIMITS.toneOfVoice} />
          <Button
            type="button"
            size="sm"
            disabled={busy.toneOfVoice || !toneDirty || toneTooLong}
            onClick={() => void save("toneOfVoice", { toneOfVoice: tone }, "Tone of voice saved.")}
          >
            {busy.toneOfVoice ? "Saving…" : "Save"}
          </Button>
        </div>
      </SettingCard>

      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear global system prompt?</AlertDialogTitle>
            <AlertDialogDescription>
              The AI will stop using the platform-wide prompt for new replies within ~1 minute.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void save("globalSystemPrompt", { globalSystemPrompt: "" }, "Global system prompt cleared.")
              }
            >
              Clear prompt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
