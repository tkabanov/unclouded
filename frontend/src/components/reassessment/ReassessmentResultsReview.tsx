import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import ResultsComparison from "@/components/ResultsComparison";
import CrisisBar from "@/components/CrisisBar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import {
  resolveReassessmentComparison,
  type ReassessmentComparisonPair,
} from "@/lib/reassessment/resolveReassessmentComparison";

/** Read-only full comparison after a completed 90-day reassessment. */
export default function ReassessmentResultsReview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const [comparison, setComparison] = useState<ReassessmentComparisonPair | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileLoading || !user?.id || !profile) return;

    let cancelled = false;
    setLoading(true);

    void resolveReassessmentComparison(user.id, profile)
      .then((pair) => {
        if (!cancelled) setComparison(pair);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile, profileLoading, user?.id]);

  const firstName = profile?.firstName?.trim() || "there";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CrisisBar />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-8">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit gap-2"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to dashboard
        </Button>

        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            90-Day Reassessment
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Here&apos;s how far you&apos;ve come, {firstName}
          </h1>
        </div>

        {loading || profileLoading ? (
          <p className="text-sm text-muted-foreground">Loading your progress…</p>
        ) : comparison && profile?.reassessmentResults ? (
          <ResultsComparison
            firstName={firstName}
            first={comparison.first}
            second={comparison.second}
            reflections={profile.reassessmentReflections}
            priorAssessmentDate={comparison.priorAssessmentDate}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load your reassessment comparison yet.
          </p>
        )}
      </main>
    </div>
  );
}
