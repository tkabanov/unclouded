import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AddWorkplacePopup from "@/components/settings/admin/AddWorkplacePopup";
import AdminDataSourceNotice from "@/components/settings/admin/AdminDataSourceNotice";
import EmployerContinuousMetricsPanel from "@/components/employer/EmployerContinuousMetricsPanel";
import EmployerAssessmentBaselinePanel from "@/components/employer/EmployerAssessmentBaselinePanel";
import ManagerTeamAggregatePanel from "@/components/employer/ManagerTeamAggregatePanel";
import WorkplaceMembersPanel from "@/components/workplace/WorkplaceMembersPanel";
import {
  adminWorkplaceToForm,
  createAdminWorkplace,
  deleteAdminWorkplace,
  fetchAdminWorkplaces,
  updateAdminWorkplace,
  type AdminWorkplaceRecord,
} from "@/lib/settings/admin/adminWorkplacesApi";
import WorkplaceEnrollmentCodesPanel from "@/components/workplace/WorkplaceEnrollmentCodesPanel";
import type { AdminDataSource } from "@/lib/settings/admin/adminDataSource";
import {
  fetchEmployerMetrics,
  type EmployerMetricSnapshot,
} from "@/lib/employer/employerMetricsApi";
import {
  fetchManagerAggregate,
  type ManagerAggregateSnapshot,
} from "@/lib/employer/managerAggregateApi";
import {
  listWorkplaceMembers,
  type WorkplaceMemberOption,
} from "@/lib/employer/managerDirectReportApi";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

export default function AdminWorkplacesTab() {
  const { user } = useAuth();
  const [workplaces, setWorkplaces] = useState<AdminWorkplaceRecord[]>([]);
  const [dataSource, setDataSource] = useState<AdminDataSource>("table");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editWorkplace, setEditWorkplace] = useState<AdminWorkplaceRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [metricsById, setMetricsById] = useState<Record<string, EmployerMetricSnapshot>>({});
  const [metricsLoadingById, setMetricsLoadingById] = useState<Record<string, boolean>>({});
  const [managerAggregateById, setManagerAggregateById] = useState<
    Record<string, ManagerAggregateSnapshot>
  >({});
  const [managerAggregateLoadingById, setManagerAggregateLoadingById] = useState<
    Record<string, boolean>
  >({});
  const [managerOptionsByWorkplace, setManagerOptionsByWorkplace] = useState<
    Record<string, WorkplaceMemberOption[]>
  >({});
  const [selectedManagerByWorkplace, setSelectedManagerByWorkplace] = useState<
    Record<string, string>
  >({});

  const popupOpen = addOpen || editWorkplace !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditWorkplace(null);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    const result = await fetchAdminWorkplaces(user.id);
    setWorkplaces(result.workplaces);
    setDataSource(result.dataSource);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load workplaces.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, user]);

  const loadManagerAggregate = useCallback((workplace: AdminWorkplaceRecord) => {
    const managerUserId = selectedManagerByWorkplace[workplace.workplaceId];
    if (!managerUserId) {
      toast.error("Select a manager with direct report links first.");
      return;
    }

    setManagerAggregateLoadingById((prev) => ({ ...prev, [workplace.workplaceId]: true }));
    void fetchManagerAggregate({ managerUserId })
      .then((snapshot) => {
        setManagerAggregateById((prev) => ({ ...prev, [workplace.workplaceId]: snapshot }));
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't load manager aggregate."),
      )
      .finally(() => {
        setManagerAggregateLoadingById((prev) => ({ ...prev, [workplace.workplaceId]: false }));
      });
  }, [selectedManagerByWorkplace]);

  const loadManagerOptions = useCallback((workplaceId: string) => {
    void listWorkplaceMembers(workplaceId)
      .then((members) => {
        const managers = members.filter((member) => member.managesATeam);
        setManagerOptionsByWorkplace((prev) => ({ ...prev, [workplaceId]: managers }));
      })
      .catch(() => toast.error("Couldn't load workplace managers."));
  }, []);

  const loadMetrics = useCallback((workplace: AdminWorkplaceRecord) => {
    if (!workplace.metricsReady) {
      toast.error(
        "Continuous metrics need a database workplace. Delete this local row and add the workplace again.",
      );
      return;
    }
    setMetricsLoadingById((prev) => ({ ...prev, [workplace.workplaceId]: true }));
    void fetchEmployerMetrics(workplace.workplaceId)
      .then((snapshot) => {
        setMetricsById((prev) => ({ ...prev, [workplace.workplaceId]: snapshot }));
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't load employer metrics."),
      )
      .finally(() => {
        setMetricsLoadingById((prev) => ({ ...prev, [workplace.workplaceId]: false }));
      });
  }, []);

  const handleSave = useCallback(
    async (form: Parameters<typeof createAdminWorkplace>[1]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        if (editWorkplace) {
          await updateAdminWorkplace(user.id, editWorkplace.workplaceId, form);
          toast.success("Workplace updated.");
        } else {
          await createAdminWorkplace(user.id, form);
          toast.success("Workplace created.");
        }
        await reload();
        closePopup();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save workplace.");
      } finally {
        setBusy(false);
      }
    },
    [busy, closePopup, editWorkplace, reload, user],
  );

  const handleDelete = useCallback(
    async (workplace: AdminWorkplaceRecord) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        await deleteAdminWorkplace(user.id, workplace.workplaceId);
        await reload();
        toast.success("Workplace deleted.");
      } catch {
        toast.error("Couldn't delete workplace.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
  );

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading workplaces…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <h3 className={bubbleStyle("Text_heading_3_")}>
          Workplaces
        </h3>
        <Button
          type="button"
          className={bubbleStyle("Button_primary_")}
          onClick={() => setAddOpen(true)}
        >
          Add workplace
        </Button>
      </div>

      <AdminDataSourceNotice source={dataSource} entityLabel="workplaces" />

      <div className="grid gap-4 md:grid-cols-2">
        {workplaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workplaces yet.</p>
        ) : (
          workplaces.map((workplace) => (
            <div
              key={workplace.workplaceId}
              className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-3 p-4")}
            >
              <div>
                <h4 className="font-semibold">
                  {workplace.name}
                </h4>
                <p
                  className="text-sm text-muted-foreground"
                >
                  {workplace.contactEmail}
                </p>
                <p className="text-xs text-muted-foreground">
                  {workplace.contractTier.toUpperCase()} · {workplace.seatCount} seats ·{" "}
                  {workplace.isActive ? "Active contract" : "Inactive"}
                </p>
              </div>
              {workplace.metricsReady ? (
                <WorkplaceEnrollmentCodesPanel workplaceId={workplace.workplaceId} disabled={busy} />
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || metricsLoadingById[workplace.workplaceId]}
                onClick={() => loadMetrics(workplace)}
              >
                Continuous metrics
              </Button>
              {workplace.metricsReady ? (
                <WorkplaceMembersPanel workplaceId={workplace.workplaceId} disabled={busy} />
              ) : null}
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium">Manager preview</span>
                  <select
                    className="rounded-md border border-input bg-background px-2 py-1.5"
                    value={selectedManagerByWorkplace[workplace.workplaceId] ?? ""}
                    disabled={busy || !workplace.metricsReady}
                    onFocus={() => loadManagerOptions(workplace.workplaceId)}
                    onChange={(event) =>
                      setSelectedManagerByWorkplace((prev) => ({
                        ...prev,
                        [workplace.workplaceId]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select manager…</option>
                    {(managerOptionsByWorkplace[workplace.workplaceId] ?? []).map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || managerAggregateLoadingById[workplace.workplaceId]}
                  onClick={() => loadManagerAggregate(workplace)}
                >
                  Manager aggregate (REQ-11)
                </Button>
              </div>
              {metricsById[workplace.workplaceId] || metricsLoadingById[workplace.workplaceId] ? (
                <>
                  <EmployerContinuousMetricsPanel
                    metrics={metricsById[workplace.workplaceId] ?? null}
                    loading={metricsLoadingById[workplace.workplaceId]}
                  />
                  <EmployerAssessmentBaselinePanel
                    metrics={metricsById[workplace.workplaceId] ?? null}
                    loading={metricsLoadingById[workplace.workplaceId]}
                  />
                </>
              ) : null}
              {managerAggregateById[workplace.workplaceId] ||
              managerAggregateLoadingById[workplace.workplaceId] ? (
                <ManagerTeamAggregatePanel
                  snapshot={managerAggregateById[workplace.workplaceId] ?? null}
                  loading={managerAggregateLoadingById[workplace.workplaceId]}
                />
              ) : null}
              <div
                className="flex justify-end gap-2"
              >
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setEditWorkplace(workplace)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleDelete(workplace)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddWorkplacePopup
        open={popupOpen}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editWorkplaceId={editWorkplace?.workplaceId ?? null}
        initialForm={
          editWorkplace ? adminWorkplaceToForm(editWorkplace) : null
        }
      />
    </div>
  );
}
