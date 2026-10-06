import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  maxTagLength?: number;
  className?: string;
  "aria-label"?: string;
};

function hasTag(tags: readonly string[], candidate: string, ignoreIndex?: number): boolean {
  const key = candidate.toLowerCase();
  return tags.some((tag, index) => index !== ignoreIndex && tag.toLowerCase() === key);
}

/**
 * Enter adds a tag, click a chip to edit it inline, × removes it.
 * Backspace on an empty input does nothing (no accidental deletes).
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  disabled,
  maxTags,
  maxTagLength,
  className,
  "aria-label": ariaLabel,
}: TagInputProps) {
  const [draft, setDraft] = React.useState("");
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editDraft, setEditDraft] = React.useState("");
  // Prevents the blur fired after Enter/Escape from committing a second time.
  const skipBlurCommit = React.useRef(false);

  const atLimit = maxTags !== undefined && value.length >= maxTags;

  const clean = (raw: string) => {
    const trimmed = raw.replace(/\s+/g, " ").trim();
    return maxTagLength ? trimmed.slice(0, maxTagLength) : trimmed;
  };

  const addDraft = () => {
    const tag = clean(draft);
    if (!tag || atLimit) return;
    if (!hasTag(value, tag)) onChange([...value, tag]);
    setDraft("");
  };

  const startEdit = (index: number) => {
    if (disabled) return;
    skipBlurCommit.current = false;
    setEditingIndex(index);
    setEditDraft(value[index] ?? "");
  };

  const commitEdit = () => {
    if (editingIndex === null || skipBlurCommit.current) return;
    skipBlurCommit.current = true;
    const tag = clean(editDraft);
    if (tag && !hasTag(value, tag, editingIndex)) {
      onChange(value.map((existing, index) => (index === editingIndex ? tag : existing)));
    } else if (!tag) {
      onChange(value.filter((_, index) => index !== editingIndex));
    }
    setEditingIndex(null);
    setEditDraft("");
  };

  const cancelEdit = () => {
    skipBlurCommit.current = true;
    setEditingIndex(null);
    setEditDraft("");
  };

  const remove = (index: number) => {
    if (disabled) return;
    onChange(value.filter((_, i) => i !== index));
    if (editingIndex === index) cancelEdit();
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={ariaLabel ? `${ariaLabel} list` : undefined}>
          {value.map((tag, index) => (
            <li key={`${tag}-${index}`}>
              {editingIndex === index ? (
                <Input
                  autoFocus
                  value={editDraft}
                  maxLength={maxTagLength}
                  className="h-8 w-48"
                  aria-label={`Edit ${tag}`}
                  onChange={(event) => setEditDraft(event.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitEdit();
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      cancelEdit();
                    }
                  }}
                />
              ) : (
                <Badge variant="secondary" className="gap-1 py-1 pl-3 pr-1 text-sm font-normal">
                  <button
                    type="button"
                    className="max-w-[16rem] truncate text-left"
                    disabled={disabled}
                    onClick={() => startEdit(index)}
                    title="Click to edit"
                  >
                    {tag}
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-background/60 disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => remove(index)}
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      <Input
        value={draft}
        disabled={disabled || atLimit}
        maxLength={maxTagLength}
        placeholder={atLimit ? `Limit of ${maxTags} reached` : placeholder}
        aria-label={ariaLabel}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addDraft();
          }
        }}
      />
    </div>
  );
}
