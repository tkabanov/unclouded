import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import DashboardLayout from "@/components/DashboardLayout";
import EmployerContinuousMetricsPanel from "@/components/employer/EmployerContinuousMetricsPanel";
import EmployerAssessmentBaselinePanel from "@/components/employer/EmployerAssessmentBaselinePanel";
import { useHrWorkplaces } from "@/hooks/useHrWorkplaces";
import {
  fetchEmployerMetrics,
  type EmployerMetricSnapshot,
} from "@/lib/employer/employerMetricsApi";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function EmployerPortalPage() {
  const { workplaces, loading: workplacesLoading, isHrContact } = useHrWorkplaces();
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<EmployerMetricSnapshot | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

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
      return;
    }

    let cancelled = false;
    setMetricsLoading(true);

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

    return () => {
      cancelled = true;
    };
  }, [selectedWorkplaceId]);

  if (!workplacesLoading && !isHrContact) {
    return <Navigate to="/dashboard" replace />;
  }

  const selectedWorkplace = workplaces.find((workplace) => workplace.id === selectedWorkplaceId);

  return (
    <DashboardLayout>
      <div className={cn(bubbleStyle("Group_transparent_"), "mx-auto w-full max-w-4xl px-4 py-8 md:px-8")}>
        <header className="mb-6 space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Employer portal
          </p>
          <h1 className={bubbleStyle("Text_heading_1_")}>Workforce insights</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Continuous utilization metrics for HR leaders — not tied to reassessment cycles. Coaching
            content and individual entries stay private.
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
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <EmployerContinuousMetricsPanel
          workplaceName={selectedWorkplace?.name}
          metrics={metrics}
          loading={workplacesLoading || metricsLoading}
        />

        <EmployerAssessmentBaselinePanel
          metrics={metrics}
          loading={workplacesLoading || metricsLoading}
          className="mt-4"
        />
      </div>
    </DashboardLayout>
  );
}
