import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import AddPathPopup from "@/components/settings/admin/AddPathPopup";
import {
  createAdminPath,
  deleteAdminPath,
  fetchAdminPaths,
  getPathTierLabel,
  setAdminPathActive,
  updateAdminPath,
  type AdminPathFormState,
  type AdminPathRecord,
} from "@/lib/settings/admin/adminPathsApi";
import {
  adminPathSessionDraftFromRecord,
  fetchAdminPathSessions,
  syncAdminPathSessions,
  type AdminPathSessionDraft,
} from "@/lib/settings/admin/adminPathSessionsApi";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const TIER_SECTIONS: readonly TierSlug[] = [TIER.FREE, TIER.PRO, TIER.PREMIUM];

type StatusFilter = "all" | "enabled" | "disabled";

function matchesSearch(path: AdminPathRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    path.name.toLowerCase().includes(q) ||
    path.description.toLowerCase().includes(q)
  );
}

export default function AdminPathsTab() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<AdminPathRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editPath, setEditPath] = useState<AdminPathRecord | null>(null);
  const [editSessions, setEditSessions] = useState<AdminPathSessionDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierSlug | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const popupOpen = addOpen || editPath !== null;

  const closePopup = useCallback(() => {
    setAddOpen(false);
    setEditPath(null);
    setEditSessions([]);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    const rows = await fetchAdminPaths(user.id);
    setPaths(rows);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load admin paths.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, user]);

  const openEdit = useCallback(
    async (path: AdminPathRecord) => {
      if (busy) return;
      setBusy(true);
      try {
        const sessions = await fetchAdminPathSessions(path.pathId);
        setEditSessions(sessions.map(adminPathSessionDraftFromRecord));
        setEditPath({ ...path });
      } catch {
        toast.error("Couldn't load path modules.");
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  const handleSave = useCallback(
    async (form: AdminPathFormState, sessions: AdminPathSessionDraft[]) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        if (editPath) {
          await updateAdminPath(user.id, editPath.pathId, { ...form, slug: editPath.slug });
          await syncAdminPathSessions(editPath.pathId, sessions);
          toast.success("Path updated.");
        } else {
          const created = await createAdminPath(user.id, form);
          await syncAdminPathSessions(created.pathId, sessions);
          toast.success("Path created.");
        }
        await reload();
        closePopup();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't save path.";
        toast.error(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, closePopup, editPath, reload, user],
  );

  const handleDelete = useCallback(
    async (path: AdminPathRecord) => {
      if (!user || busy) return;
      setBusy(true);
      try {
        await deleteAdminPath(user.id, path.pathId);
        await reload();
        toast.success("Path deleted.");
      } catch {
        toast.error("Couldn't delete path.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
  );

  const handleToggleActive = useCallback(
    async (path: AdminPathRecord, nextActive: boolean) => {
      if (busy || nextActive === path.isActive) return;
      setBusy(true);
      try {
        await setAdminPathActive(path.pathId, nextActive);
        toast.success(nextActive ? "Path enabled." : "Path disabled.");
        await reload();
      } catch {
        toast.error("Couldn't update path status.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload],
  );

  const handleTierChange = useCallback(
    async (path: AdminPathRecord, nextTier: TierSlug) => {
      if (!user || busy || nextTier === path.tier) return;
      setBusy(true);
      try {
        await updateAdminPath(user.id, path.pathId, {
          slug: path.slug,
          name: path.name,
          description: path.description,
          tier: nextTier,
          coachingMode: path.coachingMode,
          subMode: path.subMode,
          sensitivity: path.sensitivity,
        });
        toast.success("Path tier updated.");
        await reload();
      } catch {
        toast.error("Couldn't update path tier.");
      } finally {
        setBusy(false);
      }
    },
    [busy, reload, user],
  );

  const filteredBySearch = useMemo(
    () => paths.filter((p) => matchesSearch(p, search)),
    [paths, search],
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading paths…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Content library
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage coaching paths, modules and access tiers.
          </p>
        </div>
        <Button
          type="button"
          className="gap-1.5"
          onClick={() => {
            setEditSessions([]);
            setAddOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          New path
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="bg-card pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search paths"
            aria-label="Search paths"
          />
        </div>
        <select
          className="flex h-10 rounded-md border border-input bg-card px-3 text-sm"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as TierSlug | "all")}
          aria-label="Filter paths by tier"
        >
          <option value="all">All tiers</option>
          <option value={TIER.FREE}>Free</option>
          <option value={TIER.PRO}>Pro</option>
          <option value={TIER.PREMIUM}>Premium</option>
        </select>
        <select
          className="flex h-10 rounded-md border border-input bg-card px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filter paths by status"
        >
          <option value="all">All statuses</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {TIER_SECTIONS.map((tier) => {
        if (tierFilter !== "all" && tierFilter !== tier) return null;
        const sectionPaths = filteredBySearch.filter((p) => {
          if (p.tier !== tier) return false;
          if (statusFilter === "enabled") return p.isActive;
          if (statusFilter === "disabled") return !p.isActive;
          return true;
        });
        return (
          <div
            key={tier}
            className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {getPathTierLabel(tier)} Paths
              </h3>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold tabular-nums text-primary">
                {sectionPaths.length}
              </span>
            </div>
            {sectionPaths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paths in this tier.</p>
            ) : (
              <ul className="divide-y rounded-lg border border-border">
                {sectionPaths.map((path) => (
                  <li
                    key={path.pathId}
                    data-path-id={path.pathId}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{path.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {path.description.trim() || "No description"}
                        {" · "}
                        {path.sessionsCount} module{path.sessionsCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={path.tier}
                      disabled={busy}
                      aria-label={`Tier for ${path.name}`}
                      onChange={(e) => void handleTierChange(path, e.target.value as TierSlug)}
                    >
                      <option value={TIER.FREE}>free</option>
                      <option value={TIER.PRO}>pro</option>
                      <option value={TIER.PREMIUM}>premium</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={path.isActive}
                        disabled={busy}
                        aria-label="Visible to members"
                        onCheckedChange={(checked) => void handleToggleActive(path, checked)}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          path.isActive ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {path.isActive ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0"
                      disabled={busy}
                      onClick={() => void openEdit(path)}
                      title="Edit path"
                      aria-label="Edit path"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={busy}
                      onClick={() => void handleDelete(path)}
                      title="Delete path"
                      aria-label="Delete path"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <AddPathPopup
        open={popupOpen}
        onOpenChange={(open) => {
          if (!open) closePopup();
        }}
        onSubmit={handleSave}
        busy={busy}
        editPathId={editPath?.pathId ?? null}
        initialForm={
          editPath
            ? {
                slug: editPath.slug,
                name: editPath.name,
                description: editPath.description,
                tier: editPath.tier,
                coachingMode: editPath.coachingMode,
                subMode: editPath.subMode,
                sensitivity: editPath.sensitivity,
              }
            : null
        }
        initialSessions={editPath ? editSessions : addOpen ? [] : null}
      />
    </div>
  );
}
