import { useEffect, useState } from "react";
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
import {
  emptyReferralPartnerForm,
  partnerTypeLabel,
  REFERRAL_PARTNER_TYPES,
  type AdminReferralPartnerFormState,
  type ReferralPartnerType,
} from "@/lib/settings/admin/referralPartnersApi";
import { bubbleStyle } from "@/styles";

export interface AddReferralPartnerPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: AdminReferralPartnerFormState) => Promise<void>;
  busy?: boolean;
  editPartnerId?: string | null;
  initialForm?: AdminReferralPartnerFormState | null;
}

export default function AddReferralPartnerPopup({
  open,
  onOpenChange,
  onSubmit,
  busy = false,
  editPartnerId = null,
  initialForm = null,
}: AddReferralPartnerPopupProps) {
  const [form, setForm] = useState<AdminReferralPartnerFormState>(emptyReferralPartnerForm());
  const isEdit = Boolean(editPartnerId);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm ?? emptyReferralPartnerForm());
  }, [open, initialForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit referral partner" : "Add referral partner"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="rp-name">Partner name</Label>
            <Input
              id="rp-name"
              className={bubbleStyle("Input_default_")}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              disabled={busy}
            />
          </div>

          <div className="grid gap-2">
            <Label>Partner type</Label>
            <Select
              value={form.type}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, type: value as ReferralPartnerType }))
              }
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFERRAL_PARTNER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {partnerTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rp-email">Email</Label>
            <Input
              id="rp-email"
              type="email"
              className={bubbleStyle("Input_default_")}
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              disabled={busy}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rp-contact">Contact info (optional)</Label>
            <Textarea
              id="rp-contact"
              rows={3}
              value={form.contactInfo}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, contactInfo: event.target.value }))
              }
              disabled={busy}
              placeholder="Phone, notes, social…"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rp-code">
              Referral code {isEdit ? "" : "(optional — auto-generated if empty)"}
            </Label>
            <Input
              id="rp-code"
              className={bubbleStyle("Input_default_")}
              value={form.referralCode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  referralCode: event.target.value.toUpperCase(),
                }))
              }
              disabled={busy}
              placeholder="e.g. PARTNER12"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive partners keep history; new attributions are blocked.
              </p>
            </div>
            <Switch
              checked={form.status === "active"}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  status: checked ? "active" : "inactive",
                }))
              }
              disabled={busy}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              void onSubmit(form);
            }}
          >
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create partner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
