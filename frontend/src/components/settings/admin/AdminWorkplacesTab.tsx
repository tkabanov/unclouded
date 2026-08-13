import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AddWorkplacePopup from "@/components/settings/admin/AddWorkplacePopup";
import AdminDataSourceNotice from "@/components/settings/admin/AdminDataSourceNotice";
import {
  createAdminWorkplace,
  fetchAdminWorkplaces,
  formatBillingModel,
  formatBillingPeriod,
  formatPayPerActiveUtilization,
  formatSeatUtilization,
  formatWorkplacePrice,
} from "@/lib/settings/admin/adminWorkplacesApi";
import type { AdminDataSource } from "@/lib/settings/admin/adminDataSource";
import { useAuth } from "@/hooks/useAuth";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return value;
}

export default function AdminWorkplacesTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workplaces, setWorkplaces] = useState<
    Awaited<ReturnType<typeof fetchAdminWorkplaces>>["workplaces"]
  >([]);
  const [dataSource, setDataSource] = useState<AdminDataSource>("table");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
        if (!cancelled) toast.error("Couldn't load organizations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, user]);

  const handleCreate = useCallback(
    async (form: Parameters<typeof createAdminWorkplace>[1]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        const { workplace, mintError, duplicateName } = await createAdminWorkplace(user.id, form);
        if (duplicateName) {
          toast.warning(
            `Organization created. Name is similar to an existing org (“${form.name.trim()}”).`,
          );
        } else {
          toast.success("Organization created.");
        }
        if (mintError) {
          toast.warning(
            `Enrollment code was not created automatically (${mintError}). Generate or assign a code on this page.`,
          );
        }
        setAddOpen(false);
        navigate(`/admin/organizations/${workplace.workplaceId}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save organization.");
      } finally {
        setBusy(false);
      }
    },
    [busy, navigate, user],
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading organizations…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Enterprise organizations
          </h1>
          <p className="text-sm text-muted-foreground">
            Employees join via enrollment code or join link during signup / onboarding.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/organizations/usage")}
          >
            Monthly active users
          </Button>
          <Button
            type="button"
            className={bubbleStyle("Button_primary_")}
            onClick={() => setAddOpen(true)}
          >
            Add organization
          </Button>
        </div>
      </header>

      <AdminDataSourceNotice source={dataSource} entityLabel="organizations" />

      {workplaces.length === 0 ? (
        <p className="text-sm text-muted-foreground">No organizations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Tier</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Model</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Seats</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">End date</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Term</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {workplaces.map((workplace) => (
                <tr
                  key={workplace.workplaceId}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => navigate(`/admin/organizations/${workplace.workplaceId}`)}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{workplace.name}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {workplace.contractTier}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatBillingModel(workplace.billingModel)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {workplace.billingModel === "pay_per_active"
                      ? formatPayPerActiveUtilization(workplace)
                      : formatSeatUtilization(workplace.activeSeats, workplace.seatCount)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatDate(workplace.contractEndDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        workplace.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {workplace.isActive ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatBillingPeriod(workplace.billingPeriod)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatWorkplacePrice(workplace.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddWorkplacePopup
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={handleCreate}
        busy={busy}
      />
    </div>
  );
}
