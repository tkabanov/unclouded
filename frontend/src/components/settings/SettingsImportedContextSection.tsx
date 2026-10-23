import { useEffect, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteImportedContext,
  fetchImportedContext,
  saveImportedContext,
  type ImportedContext,
} from "@/lib/importedContext/importedContextApi";
import {
  IMPORTED_CONTEXT_COPY as COPY,
  IMPORTED_CONTEXT_MAX_CHARS,
} from "@/lib/importedContext/importedContextCopy";
import {
  IMPORTED_CONTEXT_FILE_ACCEPT,
  appendImportedText,
  readImportedFile,
  type ImportedFileText,
} from "@/lib/importedContext/importedContextFiles";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * NCLDD-63 (OVR-081) — Settings → Profile: import background from other AI assistants,
 * personality tests or a self-description. Files are read in the browser; only the raw text is
 * saved, after preview, edit and explicit consent. Deleting the text withdraws consent.
 */
export default function SettingsImportedContextSection() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // undefined = loading, null = nothing saved, "unavailable" = backend not deployed yet.
  const [saved, setSaved] = useState<ImportedContext | null | undefined | "unavailable">(undefined);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<ImportedFileText[] | null>(null);
  // Kept separate from `preview` so the dialog keeps its content while the close animation runs.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchImportedContext(userId).then((state) => {
      if (cancelled) return;
      if (state.status === "unavailable") setSaved("unavailable");
      else setSaved(state.context);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (saved === undefined || saved === "unavailable") return null;

  const tooLong = draft.trim().length > IMPORTED_CONTEXT_MAX_CHARS;

  const startEditing = () => {
    setDraft(saved?.content ?? "");
    setConsent(saved !== null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft("");
    setConsent(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setReading(true);
    try {
      setPreview(await Promise.all(Array.from(files).map(readImportedFile)));
      setPreviewOpen(true);
    } finally {
      setReading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const acceptPreview = () => {
    if (preview) setDraft((prev) => appendImportedText(prev, preview));
    setPreviewOpen(false);
  };

  const handleSave = async () => {
    if (!consent) {
      toast.error(COPY.consentRequired);
      return;
    }
    if (tooLong) {
      toast.error(COPY.tooLong(IMPORTED_CONTEXT_MAX_CHARS));
      return;
    }
    setSaving(true);
    try {
      await saveImportedContext(draft, consent);
      if (userId) {
        const state = await fetchImportedContext(userId);
        if (state.status === "loaded") setSaved(state.context);
      }
      cancelEditing();
      toast.success(COPY.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your information.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteImportedContext();
      setSaved(null);
      cancelEditing();
      toast.success(COPY.deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete your information.");
    } finally {
      setSaving(false);
    }
  };

  const previewHasText = preview?.some((file) => file.text) ?? false;

  return (
    <div className={cn(bubbleStyle("Group_card_"), "flex flex-col gap-4 p-6")}>
      <header className="space-y-1">
        <h2 className={bubbleStyle("Text_heading_2_")}>{COPY.title}</h2>
        <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
          {COPY.description}
        </p>
      </header>

      {editing ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="imported-context-text" className={bubbleStyle("Text_label_")}>
              {COPY.textareaLabel}
            </Label>
            <Textarea
              id="imported-context-text"
              rows={10}
              placeholder={COPY.textareaPlaceholder}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
                {COPY.fileHint}
              </p>
              <p
                className={cn(
                  bubbleStyle("Text_small_"),
                  tooLong ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {draft.trim().length.toLocaleString("en-US")} /{" "}
                {IMPORTED_CONTEXT_MAX_CHARS.toLocaleString("en-US")}
              </p>
            </div>
            {tooLong ? (
              <p className={cn(bubbleStyle("Text_small_"), "text-destructive")}>
                {COPY.tooLong(IMPORTED_CONTEXT_MAX_CHARS)}
              </p>
            ) : null}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={IMPORTED_CONTEXT_FILE_ACCEPT}
                className="hidden"
                data-testid="imported-context-file-input"
                onChange={(event) => void handleFiles(event.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={reading || saving}
                onClick={() => fileInputRef.current?.click()}
              >
                {reading ? "Reading…" : COPY.importButton}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="imported-context-consent"
              checked={consent}
              disabled={saving}
              onCheckedChange={(checked) => setConsent(checked === true)}
            />
            <Label
              htmlFor="imported-context-consent"
              className={cn(bubbleStyle("Text_small_"), "font-normal leading-snug")}
            >
              {COPY.consentLabel}
            </Label>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={cancelEditing}>
              {COPY.cancelButton}
            </Button>
            <Button
              type="button"
              data-style-ref="Button_primary_"
              className={bubbleStyle("Button_primary_")}
              disabled={saving || !consent || !draft.trim() || tooLong}
              onClick={() => void handleSave()}
            >
              {saving ? COPY.savingButton : COPY.saveButton}
            </Button>
          </div>
        </div>
      ) : saved ? (
        <div className="flex flex-col gap-3">
          <p className={bubbleStyle("Text_label_")}>{COPY.savedTitle}</p>
          <div
            className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm"
            data-testid="imported-context-saved"
          >
            {saved.content}
          </div>
          <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
            {COPY.consentGrantedOn(formatDate(saved.consentGrantedAt))}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              disabled={saving}
              onClick={() => setConfirmDelete(true)}
            >
              {COPY.deleteButton}
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={startEditing}>
              {COPY.editButton}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cn(bubbleStyle("Text_small_"), "text-muted-foreground")}>
            {COPY.emptyHint}
          </p>
          <Button type="button" variant="outline" onClick={startEditing}>
            {COPY.addButton}
          </Button>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{COPY.previewTitle}</DialogTitle>
            <DialogDescription>{COPY.previewDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            {preview?.map((file, index) => (
              <div key={`${file.fileName}-${index}`} className="flex flex-col gap-1">
                <p className="text-sm font-medium">{file.fileName}</p>
                {file.error ? (
                  <p className="text-sm text-destructive">{file.error}</p>
                ) : file.text ? (
                  <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm">
                    {file.text}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{COPY.previewEmpty}</p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              {COPY.cancelButton}
            </Button>
            <Button
              type="button"
              data-style-ref="Button_primary_"
              className={bubbleStyle("Button_primary_")}
              disabled={!previewHasText}
              onClick={acceptPreview}
            >
              {COPY.previewAdd}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{COPY.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{COPY.deleteConfirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{COPY.deleteConfirmKeep}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              {COPY.deleteConfirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
