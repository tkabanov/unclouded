import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTimeZoneOptions } from "@/lib/enums/aboutYouProfile";
import {
  emptyAdminSpecialistForm,
  type AdminSpecialistFormState,
} from "@/lib/settings/admin/adminSpecialistsApi";
import { bubbleStyle } from "@/styles";

const EMPTY_TZ = "__none__";

export interface AddSpecialistPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AdminSpecialistFormState, imageFile: File | null) => Promise<void>;
  busy?: boolean;
  editSpecialistId?: string | null;
  initialForm?: AdminSpecialistFormState | null;
}

export default function AddSpecialistPopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  editSpecialistId = null,
  initialForm = null,
}: AddSpecialistPopupProps) {
  const [form, setForm] = useState<AdminSpecialistFormState>(emptyAdminSpecialistForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isEdit = Boolean(editSpecialistId);
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);

  useEffect(() => {
    if (!open) return;
    const next = initialForm ?? emptyAdminSpecialistForm();
    setForm(next);
    setImageFile(null);
    setPreviewUrl(next.imageUrl);
  }, [open, initialForm]);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit specialist" : "Add specialist"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="specialist-name">Name</Label>
            <Input
              id="specialist-name"
              className={bubbleStyle("Input_default_")}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              disabled={busy}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="specialist-email">Email</Label>
            <Input
              id="specialist-email"
              type="email"
              className={bubbleStyle("Input_default_")}
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              disabled={busy}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="specialist-timezone">Timezone</Label>
            <Select
              value={form.timezone || EMPTY_TZ}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  timezone: value === EMPTY_TZ ? "" : value,
                }))
              }
              disabled={busy}
            >
              <SelectTrigger id="specialist-timezone" className={bubbleStyle("Input_default_")}>
                <SelectValue placeholder="Select time zone (UTC if empty)" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={EMPTY_TZ}>Not set (UTC in emails)</SelectItem>
                {timeZoneOptions.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for coach-facing emails. Session times are shown in this zone.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="specialist-bio">Description / bio</Label>
            <Textarea
              id="specialist-bio"
              rows={4}
              value={form.bio}
              onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
              disabled={busy}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="specialist-image">Profile image</Label>
            <div className="flex flex-wrap items-center gap-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover border"
                />
              ) : (
                <div className="h-16 w-16 rounded-full border bg-muted" />
              )}
              <Input
                id="specialist-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className={bubbleStyle("Input_default_")}
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setImageFile(file);
                }}
              />
            </div>
          </div>

          {isEdit ? (
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <Label htmlFor="specialist-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive specialists are hidden from new scheduling. Deactivation is blocked
                  while the coach has upcoming sessions.
                </p>
              </div>
              <Switch
                id="specialist-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
                disabled={busy}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={bubbleStyle("Button_primary_")}
            disabled={busy}
            onClick={() => void onSubmit(form, imageFile)}
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Add specialist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
