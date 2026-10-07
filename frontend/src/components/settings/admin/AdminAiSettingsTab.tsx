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

type FieldKey = "globalSystemPrompt" | "platformRules" | "prohibitedTopics" | "toneOfVoice";
type ClearableField = "globalSystemPrompt" | "platformRules";

const CLEAR_DIALOG: Record<
  ClearableField,
  { title: string; description: string; action: string; success: string }
> = {
  globalSystemPrompt: {
    title: "Clear global system prompt?",
    description: "New replies will fall back to the built-in base prompt from code within ~1 minute.",
    action: "Clear prompt",
    success: "Global system prompt cleared.",
  },
  platformRules: {
    title: "Clear platform rules?",
    description: "New replies will stop following these rules within ~1 minute.",
    action: "Clear rules",
    success: "Platform rules cleared.",
  },
};

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
  const [rules, setRules] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [tone, setTone] = useState("");
  const [busy, setBusy] = useState<Record<FieldKey, boolean>>({
    globalSystemPrompt: false,
    platformRules: false,
    prohibitedTopics: false,
    toneOfVoice: false,
  });
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<ClearableField>("globalSystemPrompt");

  useEffect(() => {
    let cancelled = false;
    fetchPlatformAiSettings()
      .then((record) => {
        if (cancelled) return;
        setSaved(record);
        setGlobalPrompt(record.globalSystemPrompt);
        setRules(record.platformRules);
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
        if (field === "platformRules") setRules(record.platformRules);
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
  const rulesDirty = rules.trim() !== saved.platformRules;
  const topicsDirty = !sameTopics(topics, saved.prohibitedTopics);
  const toneDirty = tone.trim() !== saved.toneOfVoice;
  const promptTooLong = globalPrompt.length > AI_SETTINGS_LIMITS.globalSystemPrompt;
  const rulesTooLong = rules.length > AI_SETTINGS_LIMITS.platformRules;
  const toneTooLong = tone.length > AI_SETTINGS_LIMITS.toneOfVoice;
  const clearDialog = CLEAR_DIALOG[clearTarget];
  const askClear = (field: ClearableField) => {
    setClearTarget(field);
    setConfirmClearOpen(true);
  };

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
        description="Base coaching prompt for text and voice AI chat. Applied right after safety rules; [USER_FIRST_NAME] is replaced with the user's name."
        dirty={promptDirty}
      >
        <Textarea
          value={globalPrompt}
          onChange={(event) => setGlobalPrompt(event.target.value)}
          rows={20}
          disabled={busy.globalSystemPrompt}
          aria-label="Global system prompt"
          placeholder="Empty — the built-in base prompt from code is used."
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
                else askClear("globalSystemPrompt");
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
        title="Platform rules"
        description="Short rules every AI reply must follow (chat, session opening and close, generated content). Highest priority after safety; overrides the global prompt and tone."
        dirty={rulesDirty}
      >
        <Textarea
          value={rules}
          onChange={(event) => setRules(event.target.value)}
          rows={6}
          disabled={busy.platformRules}
          aria-label="Platform rules"
          placeholder="e.g. Never give medical diagnoses. Always reply in English."
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CharCounter value={rules} max={AI_SETTINGS_LIMITS.platformRules} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy.platformRules || (!saved.platformRules && !rules)}
              onClick={() => {
                // Nothing applied yet: just discard the local text.
                if (!saved.platformRules) setRules("");
                else askClear("platformRules");
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy.platformRules || !rulesDirty || rulesTooLong}
              onClick={() =>
                void save("platformRules", { platformRules: rules }, "Platform rules saved.")
              }
            >
              {busy.platformRules ? "Saving…" : "Save"}
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
        description="Style only. Never overrides safety rules, platform rules, the global prompt or prohibited topics."
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
            <AlertDialogTitle>{clearDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{clearDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void save(clearTarget, { [clearTarget]: "" }, clearDialog.success)}
            >
              {clearDialog.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
