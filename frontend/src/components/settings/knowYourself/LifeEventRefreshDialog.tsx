import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { LIFE_EVENT_TYPES, type LifeEventType } from "@/lib/modules/moduleRefresh";
import { submitLifeEventModuleRefresh } from "@/lib/modules/moduleRefreshApi";

const LIFE_EVENT_LABELS: Record<LifeEventType, string> = {
  job_or_role_change: "Job or role change",
  relationship_change: "Relationship change",
  health_change: "Health change",
  loss_or_grief: "Loss or grief",
  other: "Something else significant",
};

interface LifeEventRefreshDialogProps {
  onSubmitted?: () => Promise<void> | void;
}

export default function LifeEventRefreshDialog({ onSubmitted }: LifeEventRefreshDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<LifeEventType>("other");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const result = await submitLifeEventModuleRefresh(user.id, eventType);
      await onSubmitted?.();
      setOpen(false);
      if (result.refreshOfferedSlugs.length > 0 || result.acceleratedSlugs.length > 0) {
        toast.success("We've unlocked relevant deep-dives for you.");
      } else {
        toast.message("Thanks — we'll surface relevant modules when they're ready.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not update your modules. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Something significant changed
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Life event check-in</DialogTitle>
          <DialogDescription>
            Optional — tell us what shifted so we can surface the most relevant deep-dives.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="life-event-type">What changed?</Label>
          <Select value={eventType} onValueChange={(value) => setEventType(value as LifeEventType)}>
            <SelectTrigger id="life-event-type">
              <SelectValue placeholder="Select an event type" />
            </SelectTrigger>
            <SelectContent>
              {LIFE_EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {LIFE_EVENT_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="cta" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? "Saving…" : "Update my modules"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
