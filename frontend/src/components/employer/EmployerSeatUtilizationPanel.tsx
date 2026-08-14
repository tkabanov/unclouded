import { formatEnrollmentSeatLine } from "@/lib/workplace/workplaceSeatLimits";
import {
  isWorkplaceEnrollmentLocked,
  WORKPLACE_ENROLLMENT_INACTIVE_BANNER,
} from "@/lib/workplace/workplaceEnrollmentLock";
import type { EmployerSeatUtilization } from "@/lib/employer/employerSeatUtilizationApi";
import { EMPLOYER_MIN_COHORT_SIZE } from "@/lib/employer/employerMetricsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

type EmployerSeatUtilizationPanelProps = {
  utilization: EmployerSeatUtilization | null;
  loading?: boolean;
  className?: string;
};

export default function EmployerSeatUtilizationPanel({
  utilization,
  loading = false,
  className,
}: EmployerSeatUtilizationPanelProps) {
  if (loading) {
    return (
      <div className={cn(bubbleStyle("Group_card_muted_"), "p-4 text-sm text-muted-foreground", className)}>
        Loading seat utilization…
      </div>
    );
  }

  if (!utilization) return null;

  const seatLine = formatEnrollmentSeatLine({
    billingModel: utilization.billingModel,
    seatCount: utilization.seatCount,
    maxSeats: utilization.maxSeats,
    activeSeats: utilization.activeSeats,
  });
  const enrollmentLocked = isWorkplaceEnrollmentLocked(utilization);

  return (
    <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-2 p-4", className)}>
      <header className="space-y-1">
        <h3 className={bubbleStyle("Text_heading_3_")}>Seat utilization</h3>
        <p className="text-xs text-muted-foreground">
          Contracted capacity vs enrolled employees. Seat count and billing terms are managed by
          Unclouded Admin. Individual coaching content stays private (cohort metrics need ≥{" "}
          {EMPLOYER_MIN_COHORT_SIZE} enrolled).
        </p>
      </header>
      <p className="text-lg font-semibold tabular-nums text-foreground">{seatLine}</p>
      <p className="text-sm text-muted-foreground">
        Status:{" "}
        <span className="font-medium text-foreground">
          {enrollmentLocked ? "Inactive" : "Active"}
        </span>
      </p>
      {enrollmentLocked ? (
        <p className="text-sm text-amber-800">{WORKPLACE_ENROLLMENT_INACTIVE_BANNER}</p>
      ) : null}
      {utilization.billingModel === "pay_per_active" && utilization.periodActiveUsers != null ? (
        <p className="text-sm text-muted-foreground">
          Active this UTC calendar month:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {utilization.periodActiveUsers}
          </span>{" "}
          (engagement events; identities not shown)
        </p>
      ) : null}
    </div>
  );
}
