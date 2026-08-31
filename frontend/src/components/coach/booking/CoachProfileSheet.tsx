import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BookableCoach } from "@/lib/coach/coachBookingApi";

type CoachProfileSheetProps = {
  coach: BookableCoach | null;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onBook: (coach: BookableCoach) => void;
};

export default function CoachProfileSheet({
  coach,
  open,
  busy,
  onOpenChange,
  onBook,
}: CoachProfileSheetProps) {
  if (!coach) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3 pr-6">
            {coach.imageUrl ? (
              <img
                src={coach.imageUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-full border bg-muted" />
            )}
            <div className="min-w-0 text-left">
              <SheetTitle>{coach.name}</SheetTitle>
              <SheetDescription>Coach profile</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {coach.bio.trim() ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {coach.bio.trim()}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No profile description yet.</p>
        )}

        <SheetFooter className="mt-6 sm:justify-start">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => {
              onBook(coach);
              onOpenChange(false);
            }}
          >
            Book with {coach.name}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
