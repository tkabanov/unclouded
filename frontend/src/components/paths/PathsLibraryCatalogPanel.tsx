import { useCallback, useEffect, useMemo, useState } from "react";
import { Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
import { useUserProfile } from "@/lib/userProfile";
import { resolveHealthModeFlags } from "@/lib/userProfile/healthModeFlags";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { fetchPathCatalog, type PathCatalogEntry } from "@/lib/paths/pathsCatalogApi";
import { pathVisibleInLibrary } from "@/lib/paths/pathEnrollmentMatching";
import { toModuleProfileInput } from "@/lib/paths/pathModuleProfileInput";
import { resolvePathModuleGate } from "@/lib/paths/pathModulePrerequisites";
import { usePathsEnrollmentStore } from "@/lib/paths/pathsEnrollmentStore";
import { Skeleton } from "@/components/ui/skeleton";
import PathCatalogCard from "@/components/paths/PathCatalogCard";
import PathsFilterRow, {
  PATHS_TIER_FILTER_ALL,
  matchesTierFilter,
  type PathsTierFilter,
} from "@/components/paths/PathsFilterRow";

export interface PathsLibraryCatalogPanelProps {
  className?: string;
  onViewPath?: (path: PathCatalogEntry) => void;
}

function isTierSlug(value: string | undefined | null): value is TierSlug {
  return value === TIER.FREE || value === TIER.PRO || value === TIER.PREMIUM;
}

function resolveUserTier(
  subscribed: boolean,
  profileTier: string | null | undefined,
  onboardingData: Record<string, unknown> | null | undefined,
): TierSlug {
  if (typeof profileTier === "string" && isTierSlug(profileTier)) return profileTier;
  const raw = onboardingData?.tier;
  if (typeof raw === "string" && isTierSlug(raw)) return raw;
  return subscribed ? TIER.PRO : TIER.FREE;
}

export default function PathsLibraryCatalogPanel({
  className,
  onViewPath,
}: PathsLibraryCatalogPanelProps) {
  const { profile, loading: profileLoading } = useUserProfile();
  const { enrollments } = usePathsEnrollmentStore();
  const [loading, setLoading] = useState(true);
  const [paths, setPaths] = useState<PathCatalogEntry[]>([]);
  const [selectedTier, setSelectedTier] = useState<PathsTierFilter>(PATHS_TIER_FILTER_ALL);

  const userTier = resolveUserTier(
    profile?.subscribed ?? false,
    profile?.tier ?? null,
    profile?.onboardingData ?? null,
  );
  const healthFlags = useMemo(
    () =>
      resolveHealthModeFlags({
        onboardingData: profile?.onboardingData ?? null,
        results: profile?.results ?? null,
        roleType: profile?.roleType ?? null,
        roleTypes: profile?.roleTypes ?? null,
        aboutYou: profile?.aboutYou ?? null,
      }),
    [
      profile?.onboardingData,
      profile?.results,
      profile?.roleType,
      profile?.roleTypes,
      profile?.aboutYou,
    ],
  );
  const moduleProfile = useMemo(() => toModuleProfileInput(profile), [profile]);

  const enrollmentBySlug = useMemo(() => {
    const map = new Map<string, (typeof enrollments)[number]>();
    for (const row of enrollments) {
      if (row.pathSlug) map.set(row.pathSlug, row);
    }
    return map;
  }, [enrollments]);

  const loadPaths = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchPathCatalog();
      setPaths(rows);
    } catch (err) {
      console.error("Failed to load path catalog", err);
      setPaths([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPaths();
  }, [loadPaths]);

  const visiblePaths = useMemo(
    () =>
      paths.filter((path) =>
        pathVisibleInLibrary(path, {
          userTier,
          ...healthFlags,
        }),
      ),
    [paths, userTier, healthFlags],
  );

  const filteredPaths = useMemo(
    () => visiblePaths.filter((path) => matchesTierFilter(path.tier, selectedTier)),
    [visiblePaths, selectedTier],
  );

  const catalogLoading = loading || profileLoading;

  return (
    <section className={cn("flex w-full flex-col gap-4", className)}>
      <div className={cn(bubbleStyle("Group_transparent_"), "flex items-center gap-2")}>
        <Route className={cn(bubbleStyle("Icon_primary_"), "h-5 w-5 shrink-0")} aria-hidden />
        <h2 className={cn(bubbleStyle("Text_heading_3_"), "text-base font-semibold text-foreground")}>
          Guided Paths
        </h2>
      </div>

      <PathsFilterRow selectedTier={selectedTier} onTierChange={setSelectedTier} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {catalogLoading ? (
          <>
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </>
        ) : filteredPaths.length === 0 ? (
          <p className={cn(bubbleStyle("Text_body_muted_"), "col-span-full text-sm")}>
            {visiblePaths.length === 0
              ? "No guided paths are available for your profile yet."
              : "No paths match the selected tier."}
          </p>
        ) : (
          filteredPaths.map((path) => (
            <PathCatalogCard
              key={path.id}
              path={path}
              enrollment={enrollmentBySlug.get(path.slug) ?? null}
              userTier={userTier}
              moduleGate={resolvePathModuleGate(moduleProfile, path.triggerSignals)}
              onViewDetails={onViewPath}
            />
          ))
        )}
      </div>
    </section>
  );
}
