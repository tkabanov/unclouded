import { useCallback, useEffect, useId, useMemo, useState, type MouseEvent } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
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

type SortKey = "name" | "type" | "dateJoined" | "status";
type SortDir = "asc" | "desc";

const TYPE_ORDER: Record<AdminUserTypeSlug, number> = {
  free: 0,
  pro: 1,
  premium: 2,
  canceled: 3,
};

function formatJoined(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function compareUsers(a: AdminUserListItem, b: AdminUserListItem, key: SortKey, dir: SortDir): number {
  const mul = dir === "asc" ? 1 : -1;
  switch (key) {
    case "name":
      return mul * a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    case "type":
      return mul * ((TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99));
    case "dateJoined": {
      const ta = a.dateJoined ? Date.parse(a.dateJoined) : 0;
      const tb = b.dateJoined ? Date.parse(b.dateJoined) : 0;
      return mul * (ta - tb);
    }
    case "status": {
      const sa = a.isActive ? 0 : 1;
      const sb = b.isActive ? 0 : 1;
      return mul * (sa - sb);
    }
    default:
      return 0;
  }
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === column;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 font-semibold hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={() => onSort(column)}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </th>
  );
}

export type AdminUsersTableProps = {
  workplaceId?: string;
  onUserNavigate: (userId: string) => void;
  /** When true, omit the page-level Users header (for embedding on org detail). */
  embedded?: boolean;
  title?: string;
  emptyMessage?: string;
};

export default function AdminUsersTable({
  workplaceId,
  onUserNavigate,
  embedded = false,
  title = "Users",
  emptyMessage = "No users match these filters.",
}: AdminUsersTableProps) {
  const idPrefix = useId();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AdminUserTypeSlug | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "deactivated" | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("dateJoined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const reload = useCallback(async () => {
    const rows = await fetchAdminUsersList({
      search,
      typeFilter,
      statusFilter,
      workplaceId,
    });
    setUsers(rows);
  }, [search, statusFilter, typeFilter, workplaceId]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, workplaceId]);

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

  const sortedUsers = useMemo(() => {
    const copy = [...users];
    copy.sort((a, b) => compareUsers(a, b, sortKey, sortDir));
    return copy;
  }, [users, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageUsers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedUsers.slice(start, start + PAGE_SIZE);
  }, [safePage, sortedUsers]);
  const rangeStart = sortedUsers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sortedUsers.length);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(key === "dateJoined" ? "desc" : "asc");
      return key;
    });
  }, []);

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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2
            className={cn(
              embedded
                ? "text-lg font-semibold tracking-tight text-foreground"
                : "text-2xl font-semibold tracking-tight text-foreground md:text-3xl",
            )}
          >
            {title}
          </h2>
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

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${idPrefix}-type`}>
            Type
          </label>
          <select
            id={`${idPrefix}-type`}
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
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${idPrefix}-status`}>
            Status
          </label>
          <select
            id={`${idPrefix}-status`}
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
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs">
                <tr>
                  <SortHeader
                    label="Name"
                    column="name"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Email</th>
                  <SortHeader
                    label="Type"
                    column="type"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Joined"
                    column="dateJoined"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Status"
                    column="status"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageUsers.map((user) => (
                  <tr
                    key={user.userId}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => onUserNavigate(user.userId)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{adminUserTypeLabel(user.type)}</Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
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
              Showing {rangeStart}–{rangeEnd} of {sortedUsers.length}
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
