import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchAdminWorkplaceMonthlyActiveReport,
  formatBillingModel,
  formatBillingPeriod,
  formatWorkplacePrice,
  type WorkplaceMonthlyActiveRow,
} from "@/lib/settings/admin/adminWorkplacesApi";

function defaultPeriod(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function toCsv(rows: WorkplaceMonthlyActiveRow[], year: number, month: number): string {
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const header = [
    "organization",
    "billing_model",
    "period",
    "active_count",
    "enrolled_count",
    "target_seats",
    "max_seats",
    "price",
    "payment_term",
  ];
  const lines = rows.map((row) =>
    [
      JSON.stringify(row.workplaceName),
      row.billingModel,
      period,
      row.activeCount,
      row.enrolledCount,
      row.seatCount,
      row.maxSeats ?? "",
      row.price ?? "",
      row.billingPeriod ?? "",
    ].join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export default function AdminOrganizationUsageReport() {
  const navigate = useNavigate();
  const initial = defaultPeriod();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [rows, setRows] = useState<WorkplaceMonthlyActiveRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminWorkplaceMonthlyActiveReport(year, month);
      setRows(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load active-users report.");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleExport = () => {
    const csv = toCsv(rows, year, month);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workplace-active-users-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded.");
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
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
            Monthly active users
          </h1>
          <p className="text-sm text-muted-foreground">
            US-208 — enrolled enterprise members with at least one engagement event in the selected
            UTC month (chat, path progress, journal, assessment, or daily check-in).
          </p>
        </div>
        <Button type="button" variant="outline" disabled={loading || rows.length === 0} onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="usage-year">
            Year
          </label>
          <input
            id="usage-year"
            type="number"
            className="flex h-10 w-28 rounded-md border border-input bg-card px-3 text-sm"
            value={year}
            onChange={(event) => setYear(Number(event.target.value) || initial.year)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="usage-month">
            Month
          </label>
          <select
            id="usage-month"
            className="flex h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void reload()}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No organizations found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Organization</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Model</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Active</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Enrolled</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Target</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Max</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Term</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr
                  key={row.workplaceId}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => navigate(`/admin/organizations/${row.workplaceId}`)}
                >
                  <td className="px-4 py-3 font-medium">{row.workplaceName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatBillingModel(row.billingModel)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.activeCount}</td>
                  <td className="px-4 py-3 tabular-nums">{row.enrolledCount}</td>
                  <td className="px-4 py-3 tabular-nums">{row.seatCount}</td>
                  <td className="px-4 py-3 tabular-nums">{row.maxSeats ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatBillingPeriod(row.billingPeriod)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatWorkplacePrice(row.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
