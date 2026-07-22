import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import ResultsComparison from "@/components/ResultsComparison";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { downloadReassessmentProgressPdf } from "@/lib/reassessment/downloadReassessmentProgressPdf";
import {
  resolveReassessmentComparison,
  type ReassessmentComparisonPair,
} from "@/lib/reassessment/resolveReassessmentComparison";

export default function DashboardReassessmentProgressCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { firstName, profile } = useDashboardUserContext();
  const [comparison, setComparison] = useState<ReassessmentComparisonPair | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !profile?.reassessmentCompletedAt || !profile.reassessmentResults) {
      setComparison(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void resolveReassessmentComparison(user.id, profile)
      .then((pair) => {
        if (!cancelled) setComparison(pair);
      })
      .catch((err) => {
        console.error("Failed to load reassessment comparison", err);
        if (!cancelled) setComparison(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile, user?.id]);

  const handleDownloadPdf = useCallback(() => {
    if (!comparison) return;
    try {
      downloadReassessmentProgressPdf(
        firstName,
        comparison.first,
        comparison.second,
        profile?.reassessmentReflections,
      );
      toast.success("Your progress report is downloading.");
    } catch (err) {
      console.error("Failed to generate comparison PDF", err);
      toast.error("Couldn't generate the report. Please try again.");
    }
  }, [comparison, firstName, profile?.reassessmentReflections]);

  if (loading || !comparison || !profile?.reassessmentResults) return null;

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Your progress</h2>
          <p className="text-sm text-muted-foreground">
            Comparing your first assessment with your 90-day reassessment
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate("/onboarding?reassessment=results")}
          >
            View full
          </Button>
          <Button
            type="button"
            variant="cta"
            size="sm"
            className="h-9 gap-1.5 px-4 py-2 text-sm shadow-sm"
            onClick={handleDownloadPdf}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Progress PDF
          </Button>
        </div>
      </div>

      <ResultsComparison
        firstName={firstName}
        first={comparison.first}
        second={comparison.second}
        reflections={profile.reassessmentReflections}
        priorAssessmentDate={comparison.priorAssessmentDate}
        compact
      />
    </div>
  );
}
