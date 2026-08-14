import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import DashboardLayout from "@/components/DashboardLayout";
import EmployerContinuousMetricsPanel from "@/components/employer/EmployerContinuousMetricsPanel";
import EmployerAssessmentBaselinePanel from "@/components/employer/EmployerAssessmentBaselinePanel";
import EmployerEnrollmentCodesPanel from "@/components/employer/EmployerEnrollmentCodesPanel";
import EmployerMonthlyTrendsPanel from "@/components/employer/EmployerMonthlyTrendsPanel";
import EmployerSeatUtilizationPanel from "@/components/employer/EmployerSeatUtilizationPanel";
import EmployerSuccessPlanAssignPanel from "@/components/employer/EmployerSuccessPlanAssignPanel";
import WorkplaceMembersPanel from "@/components/workplace/WorkplaceMembersPanel";
import { useHrWorkplaces } from "@/hooks/useHrWorkplaces";
import {
  fetchEmployerMetrics,
  type EmployerMetricSnapshot,
} from "@/lib/employer/employerMetricsApi";
import {
  fetchEmployerSeatUtilization,
  type EmployerSeatUtilization,
} from "@/lib/employer/employerSeatUtilizationApi";
import { EMPLOYER_MIN_COHORT_SIZE } from "@/lib/employer/employerMetricsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";
import { isWorkplaceEnrollmentLocked } from "@/lib/workplace/workplaceEnrollmentLock";

export default function EmployerPortalPage() {
  const { workplaces, loading: workplacesLoading, isHrContact } = useHrWorkplaces();
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<EmployerMetricSnapshot | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [seats, setSeats] = useState<EmployerSeatUtilization | null>(null);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [rosterRevision, setRosterRevision] = useState(0);

  useEffect(() => {
    if (workplaces.length === 0) {
      setSelectedWorkplaceId(null);
      return;
    }
    setSelectedWorkplaceId((current) => current ?? workplaces[0]?.id ?? null);
  }, [workplaces]);

  useEffect(() => {
    if (!selectedWorkplaceId) {
      setMetrics(null);
      setSeats(null);
      return;
    }

    let cancelled = false;
    setMetricsLoading(true);
    setSeatsLoading(true);

    void fetchEmployerMetrics(selectedWorkplaceId)
      .then((snapshot) => {
        if (!cancelled) setMetrics(snapshot);
      })
      .catch(() => {
        if (!cancelled) {
          setMetrics(null);
          toast.error("Couldn't load employer metrics.");
        }
      })
      .finally(() => {
        if (!cancelled) setMetricsLoading(false);
      });

    void fetchEmployerSeatUtilization(selectedWorkplaceId)
      .then((row) => {
        if (!cancelled) setSeats(row);
      })
      .catch(() => {
        if (!cancelled) {
          setSeats(null);
          toast.error("Couldn't load seat utilization.");
        }
      })
      .finally(() => {
        if (!cancelled) setSeatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedWorkplaceId]);

  useEffect(() => {
    if (!selectedWorkplaceId || rosterRevision === 0) return;

    let cancelled = false;
    setSeatsLoading(true);
    void fetchEmployerSeatUtilization(selectedWorkplaceId)
      .then((row) => {
        if (!cancelled) setSeats(row);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't refresh seat utilization.");
      })
      .finally(() => {
        if (!cancelled) setSeatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rosterRevision, selectedWorkplaceId]);

  const handleMembershipChange = useCallback(() => {
    setRosterRevision((n) => n + 1);
  }, []);

  if (!workplacesLoading && !isHrContact) {
    return <Navigate to="/dashboard" replace />;
  }

  const selectedWorkplace = workplaces.find((workplace) => workplace.id === selectedWorkplaceId);
  const enrollmentLocked =
    isWorkplaceEnrollmentLocked(selectedWorkplace) ||
    (seats?.workplaceId === selectedWorkplaceId && isWorkplaceEnrollmentLocked(seats));
  const actionsDisabled = workplacesLoading || metricsLoading;

  return (
    <DashboardLayout>
      <div className={cn(bubbleStyle("Group_transparent_"), "mx-auto w-full max-w-4xl px-4 py-8 md:px-8")}>
        <header className="mb-6 space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Employer portal
          </p>
          <h1 className={bubbleStyle("Text_heading_1_")}>Workforce insights</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage seats and enrollment for your organization, then review anonymized engagement.
            Coaching content, assessments, and individual entries stay private. Aggregate breakdowns
            need at least {EMPLOYER_MIN_COHORT_SIZE} enrolled employees.
          </p>
        </header>

        {workplaces.length > 1 ? (
          <label className="mb-4 flex max-w-md flex-col gap-2 text-sm">
            <span className="font-medium text-foreground">Organization</span>
            <select
              className="rounded-md border border-input bg-background px-3 py-2"
              value={selectedWorkplaceId ?? ""}
              onChange={(event) => setSelectedWorkplaceId(event.target.value || null)}
            >
              {workplaces.map((workplace) => (
                <option key={workplace.id} value={workplace.id}>
                  {workplace.name}
                  {isWorkplaceEnrollmentLocked(workplace) ? " (Inactive)" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <EmployerSeatUtilizationPanel
          utilization={seats}
          loading={workplacesLoading || seatsLoading}
          className="mb-4"
        />

        <EmployerContinuousMetricsPanel
          workplaceName={selectedWorkplace?.name}
          metrics={metrics}
          loading={workplacesLoading || metricsLoading}
        />

        <EmployerMonthlyTrendsPanel
          metrics={metrics}
          loading={workplacesLoading || metricsLoading}
          className="mt-4"
        />

        <EmployerAssessmentBaselinePanel
          metrics={metrics}
          loading={workplacesLoading || metricsLoading}
          className="mt-4"
        />

        {selectedWorkplaceId ? (
          <>
            <WorkplaceMembersPanel
              workplaceId={selectedWorkplaceId}
              disabled={actionsDisabled}
              enrollmentLocked={enrollmentLocked}
              compact
              className="mt-4"
              onMembershipChange={handleMembershipChange}
            />
            <EmployerSuccessPlanAssignPanel
              workplaceId={selectedWorkplaceId}
              disabled={actionsDisabled}
            />
            <EmployerEnrollmentCodesPanel
              workplaceId={selectedWorkplaceId}
              disabled={actionsDisabled}
              enrollmentLocked={enrollmentLocked}
              refreshToken={rosterRevision}
            />
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
