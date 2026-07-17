import { Badge } from "@/components/ui/badge";
import type { ModuleAvailabilityStatus } from "@/lib/modules/moduleSchedulerTypes";
import { cn } from "@/lib/utils";

interface ModuleStatusBadgeProps {
  status: ModuleAvailabilityStatus;
  className?: string;
}

const STATUS_LABELS: Record<ModuleAvailabilityStatus, string> = {
  locked: "Locked",
  available: "Available",
  completed: "Completed",
  refresh_available: "Refresh available",
};

export default function ModuleStatusBadge({ status, className }: ModuleStatusBadgeProps) {
  const variant =
    status === "completed"
      ? "secondary"
      : status === "available" || status === "refresh_available"
        ? "default"
        : "outline";

  return (
    <Badge
      variant={variant}
      className={cn(
        status === "locked" && "border-muted-foreground/30 text-muted-foreground",
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
