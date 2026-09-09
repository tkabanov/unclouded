import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import ModuleResultsScreen from "@/components/modules/ModuleResultsScreen";
import ModuleWizardShell from "@/components/modules/ModuleWizardShell";
import { getModuleDefinition } from "@/lib/modules/moduleConfigApi";
import { getModuleAvailability } from "@/lib/modules/moduleScheduler";
import { isModuleSlug } from "@/lib/modules/moduleSlugs";
import { resolveModuleResults } from "@/lib/modules/results/resolveModuleResults";
import { useUserProfile } from "@/lib/userProfile";

/** Read-only review of a completed module's stored results — no write of any kind. */
export default function ModuleResultsPage() {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const navigate = useNavigate();
  const { profile } = useUserProfile();

  const slug = moduleSlug && isModuleSlug(moduleSlug) ? moduleSlug : null;
  const definition = useMemo(() => (slug ? getModuleDefinition(slug) : null), [slug]);

  const availability = useMemo(() => {
    if (!profile || !slug) return null;
    return getModuleAvailability(profile, new Date())[slug];
  }, [profile, slug]);

  const canReview =
    availability?.status === "completed" || availability?.status === "refresh_available";

  useEffect(() => {
    if (!slug || !profile || !availability) return;

    if (!canReview) {
      toast.info("Complete this module first to review its results.");
      navigate("/settings?tab=profile", { replace: true });
    }
  }, [slug, profile, availability, canReview, navigate]);

  const results = useMemo(() => {
    if (!slug || !profile || !canReview) return null;
    return resolveModuleResults(slug, profile);
  }, [slug, profile, canReview]);

  if (!slug || !definition || !results) {
    return null;
  }

  return (
    <ModuleWizardShell moduleTitle={definition.displayTitle} onBack={() => navigate("/settings?tab=profile")}>
      <ModuleResultsScreen
        definition={definition}
        results={results}
        unlockedPaths={[]}
        submitting={false}
        onFinish={() => navigate("/settings?tab=profile")}
      />
    </ModuleWizardShell>
  );
}
