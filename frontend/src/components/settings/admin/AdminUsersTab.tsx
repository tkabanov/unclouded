import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AdminUserDetailPanel from "@/components/settings/admin/AdminUserDetail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAdminUsersList,
  setAdminUserActive,
} from "@/lib/settings/admin/adminUsersApi";
import {
  adminUserTypeLabel,
  type AdminUserListItem,
  type AdminUserTypeSlug,
} from "@/lib/settings/admin/adminUserType";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function formatJoined(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function AdminUsersTab() {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AdminUserTypeSlug | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "deactivated" | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const reload = useCallback(async () => {
    const rows = await fetchAdminUsersList({ search, typeFilter, statusFilter });
    setUsers(rows);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    const nextCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
    setPage((p) => Math.min(p, nextCount));
  }, [users.length]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageUsers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [safePage, users]);
  const rangeStart = users.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, users.length);

  const handleToggleActive = useCallback(
    async (user: AdminUserListItem, e?: MouseEvent) => {
      e?.stopPropagation();
      if (busyId) return;
      setBusyId(user.userId);
      try {
        await setAdminUserActive(user.userId, !user.isActive);
        toast.success(user.isActive ? "User deactivated." : "User reactivated.");
        await reload();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't update status.";
        toast.error(message);
      } finally {
        setBusyId(null);
      }
    },
    [busyId, reload],
  );

  if (routeUserId) {
    return (
      <AdminUserDetailPanel
        userId={routeUserId}
        onBack={() => navigate("/admin/users")}
        onStatusChanged={() => void reload()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Users
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${users.length} total accounts`}
          </p>
        </div>
        <Input
          className="max-w-xs bg-card"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email"
          aria-label="Search name or email"
        />
      </header>

      {/* Kept filters — feature beyond Lovable */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-users-type">
            Type
          </label>
          <select
            id="admin-users-type"
            className="flex h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AdminUserTypeSlug | "all")}
          >
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-users-status">
            Status
          </label>
          <select
            id="admin-users-status"
            className="flex h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "active" | "deactivated" | "all")
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users match these filters.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageUsers.map((user) => (
                  <tr
                    key={user.userId}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => navigate(`/admin/users/${user.userId}`)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{adminUserTypeLabel(user.type)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatJoined(user.dateJoined)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          user.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {user.isActive ? "active" : "deactivated"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === user.userId}
                        onClick={(e) => void handleToggleActive(user, e)}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {users.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="min-w-[5.5rem] text-center text-sm tabular-nums text-muted-foreground">
                {safePage} / {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
