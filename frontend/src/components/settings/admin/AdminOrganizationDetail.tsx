import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AddWorkplacePopup from "@/components/settings/admin/AddWorkplacePopup";
import AdminUsersTable from "@/components/settings/admin/AdminUsersTable";
import EmployerContinuousMetricsPanel from "@/components/employer/EmployerContinuousMetricsPanel";
import EmployerAssessmentBaselinePanel from "@/components/employer/EmployerAssessmentBaselinePanel";
import ManagerTeamAggregatePanel from "@/components/employer/ManagerTeamAggregatePanel";
import WorkplaceMembersPanel from "@/components/workplace/WorkplaceMembersPanel";
import WorkplaceEnrollmentCodesPanel from "@/components/workplace/WorkplaceEnrollmentCodesPanel";
import { Button } from "@/components/ui/button";
import {
  adminWorkplaceToForm,
  deleteAdminWorkplace,
  fetchAdminWorkplace,
  formatBillingModel,
  formatBillingPeriod,
  formatInvoiceStatus,
  formatPayPerActiveUtilization,
  formatPaymentMethod,
  formatSeatUtilization,
  formatWorkplacePrice,
  payPerActiveOverTargetMessage,
  updateAdminWorkplace,
  type AdminWorkplaceRecord,
} from "@/lib/settings/admin/adminWorkplacesApi";
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-baseline">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export default function AdminOrganizationDetail() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workplace, setWorkplace] = useState<AdminWorkplaceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [metrics, setMetrics] = useState<EmployerMetricSnapshot | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [managerAggregate, setManagerAggregate] = useState<ManagerAggregateSnapshot | null>(null);
  const [managerAggregateLoading, setManagerAggregateLoading] = useState(false);
  const [managerOptions, setManagerOptions] = useState<WorkplaceMemberOption[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");

  const reload = useCallback(async () => {
    if (!user || !organizationId) return;
    const row = await fetchAdminWorkplace(user.id, organizationId);
    setWorkplace(row);
  }, [organizationId, user]);

  useEffect(() => {
    if (!user || !organizationId) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load organization.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, reload, user]);

  const handleSave = useCallback(
    async (form: Parameters<typeof updateAdminWorkplace>[2]) => {
      if (!user || !workplace || busy) return;
      setBusy(true);
      try {
        const previousContact = workplace.contactEmail.trim().toLowerCase();
        const nextContact = form.contactEmail.trim().toLowerCase();
        const contactChanged = previousContact !== nextContact;

        const updated = await updateAdminWorkplace(user.id, workplace.workplaceId, form, {
          activeSeats: workplace.activeSeats,
        });
        setWorkplace(updated);
        setEditOpen(false);
        toast.success("Organization updated.");
        if (contactChanged) {
          toast.message(
            "HR contact email updated. Portal access follows the new contact email — they are not auto-enrolled as an employee. Enroll separately from the members panel if they need clinical access.",
          );
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save organization.");
      } finally {
        setBusy(false);
      }
    },
    [busy, user, workplace],
  );

  const handleDelete = useCallback(async () => {
    if (!user || !workplace || busy) return;
    if (!window.confirm(`Delete organization “${workplace.name}”?`)) return;
    setBusy(true);
    try {
      await deleteAdminWorkplace(user.id, workplace.workplaceId);
      toast.success("Organization deleted.");
      navigate("/admin/organizations");
    } catch {
      toast.error("Couldn't delete organization.");
    } finally {
      setBusy(false);
    }
  }, [busy, navigate, user, workplace]);

  const loadMetrics = useCallback(() => {
    if (!workplace) return;
    if (!workplace.metricsReady) {
      toast.error(
        "Continuous metrics need a database workplace. Delete this local row and add the organization again.",
      );
      return;
    }
    setMetricsLoading(true);
    void fetchEmployerMetrics(workplace.workplaceId)
      .then((snapshot) => setMetrics(snapshot))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't load employer metrics."),
      )
      .finally(() => setMetricsLoading(false));
  }, [workplace]);

  const loadManagerOptions = useCallback(() => {
    if (!workplace?.metricsReady) return;
    void listWorkplaceMembers(workplace.workplaceId)
      .then((members) => {
        setManagerOptions(members.filter((member) => member.managesATeam));
      })
      .catch(() => toast.error("Couldn't load workplace managers."));
  }, [workplace]);

  const loadManagerAggregate = useCallback(() => {
    if (!selectedManagerId) {
      toast.error("Select a manager with direct report links first.");
      return;
    }
    setManagerAggregateLoading(true);
    void fetchManagerAggregate({ managerUserId: selectedManagerId })
      .then((snapshot) => setManagerAggregate(snapshot))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't load manager aggregate."),
      )
      .finally(() => setManagerAggregateLoading(false));
  }, [selectedManagerId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading organization…</div>;
  }

  if (!workplace) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Organization not found.</p>
        <Button type="button" variant="outline" onClick={() => navigate("/admin/organizations")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to organizations
        </Button>
      </div>
    );
  }

  const overTargetWarning = payPerActiveOverTargetMessage(
    workplace.billingModel,
    workplace.activeSeats,
    workplace.seatCount,
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 w-fit"
            onClick={() => navigate("/admin/organizations")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Organizations
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {workplace.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Contract details, enrollment, and organization members.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void handleDelete()}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Organization info</h2>
        <dl className="grid gap-3">
          <InfoRow label="Organization name" value={workplace.name} />
          <InfoRow label="HR contact email" value={workplace.contactEmail} />
          <InfoRow label="Contract tier" value={workplace.contractTier === "premium" ? "Premium" : "Pro"} />
          <InfoRow label="Billing model" value={formatBillingModel(workplace.billingModel)} />
          <InfoRow
            label="Seats"
            value={
              workplace.billingModel === "pay_per_active"
                ? formatPayPerActiveUtilization(workplace)
                : formatSeatUtilization(workplace.activeSeats, workplace.seatCount)
            }
          />
          {overTargetWarning ? (
            <p className="text-xs text-amber-700">{overTargetWarning}</p>
          ) : null}
          <InfoRow label="Start date" value={workplace.contractStartDate ?? "—"} />
          <InfoRow label="End date" value={workplace.contractEndDate ?? "—"} />
          <InfoRow label="Payment term" value={formatBillingPeriod(workplace.billingPeriod)} />
          <InfoRow label="Payment collection" value={formatPaymentMethod(workplace.paymentMethod)} />
          <InfoRow label="Invoice status" value={formatInvoiceStatus(workplace.invoiceStatus)} />
          <InfoRow label="Price" value={formatWorkplacePrice(workplace.price)} />
          <InfoRow label="Billing notes" value={workplace.billingNotes?.trim() || "—"} />
          <InfoRow
            label="Status"
            value={workplace.isActive ? "Active" : "Inactive"}
          />
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Contract end date and inactive status block new enrollments only; existing members keep
          access until revoked. Tier changes update enrolled members immediately. Managers are
          assigned via member roles below (not a separate manager email field).
        </p>
      </section>

      {workplace.metricsReady ? (
        <WorkplaceEnrollmentCodesPanel
          workplaceId={workplace.workplaceId}
          disabled={busy}
          billingModel={workplace.billingModel}
          maxSeats={workplace.maxSeats}
          seatCount={workplace.seatCount}
        />
      ) : null}

      <AdminUsersTable
        embedded
        workplaceId={workplace.workplaceId}
        title="Organization users"
        emptyMessage="No users enrolled in this organization yet."
        onUserNavigate={(userId) => navigate(`/admin/users/${userId}`)}
      />

      {workplace.metricsReady ? (
        <WorkplaceMembersPanel workplaceId={workplace.workplaceId} disabled={busy} />
      ) : null}

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Metrics & manager preview</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || metricsLoading}
            onClick={loadMetrics}
          >
            Continuous metrics
          </Button>
        </div>
        <label className="flex max-w-md flex-col gap-1 text-xs">
          <span className="font-medium">Manager preview</span>
          <select
            className="rounded-md border border-input bg-background px-2 py-1.5"
            value={selectedManagerId}
            disabled={busy || !workplace.metricsReady}
            onFocus={loadManagerOptions}
            onChange={(event) => setSelectedManagerId(event.target.value)}
          >
            <option value="">Select manager…</option>
            {managerOptions.map((member) => (
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
          className="w-fit"
          disabled={busy || managerAggregateLoading}
          onClick={loadManagerAggregate}
        >
          Manager aggregate (REQ-11)
        </Button>
        {metrics || metricsLoading ? (
          <>
            <EmployerContinuousMetricsPanel metrics={metrics} loading={metricsLoading} />
            <EmployerAssessmentBaselinePanel metrics={metrics} loading={metricsLoading} />
          </>
        ) : null}
        {managerAggregate || managerAggregateLoading ? (
          <ManagerTeamAggregatePanel
            snapshot={managerAggregate}
            loading={managerAggregateLoading}
          />
        ) : null}
      </section>

      <AddWorkplacePopup
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleSave}
        busy={busy}
        editWorkplaceId={workplace.workplaceId}
        initialForm={adminWorkplaceToForm(workplace)}
        activeSeats={workplace.activeSeats}
      />
    </div>
  );
}
