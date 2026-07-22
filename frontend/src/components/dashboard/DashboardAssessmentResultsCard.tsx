import { useCallback } from "react";
import { CircleCheck, Download, Gauge, Target } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { assessmentScoreClassName } from "@/lib/dashboard/assessmentScoreStyle";
import { downloadOnboardingResultsPdf } from "@/lib/dashboard/downloadOnboardingResultsPdf";
import { cn } from "@/lib/utils";

const SCORE_METRICS = [
  { label: "Stability", key: "stability_score" as const },
  { label: "Performance", key: "performance_score" as const },
  { label: "Alignment", key: "alignment_score" as const },
  { label: "Orientation", key: "orientation_score" as const },
];

export default function DashboardAssessmentResultsCard() {
  const { firstName, hasResults, profile } = useDashboardUserContext();
  const results = profile?.results ?? null;

  const handleDownloadPdf = useCallback(() => {
    if (!results) return;
    try {
      downloadOnboardingResultsPdf(firstName, results);
      toast.success("Your results PDF is downloading.");
    } catch (err) {
      console.error("Failed to generate PDF", err);
      toast.error("Couldn't generate the PDF. Please try again.");
    }
  }, [firstName, results]);

  if (!hasResults || !results) return null;

  return (
    <Card className="overflow-hidden border-primary/20 shadow-card">
      <div className="flex items-center justify-between gap-4 border-b border-primary/10 bg-primary/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Gauge className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight text-foreground">
              Your Assessment Results
            </h2>
            <p className="text-xs text-muted-foreground">Based on your onboarding responses</p>
          </div>
        </div>
        <Button
          type="button"
          variant="cta"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-4 py-2 text-sm shadow-sm"
          onClick={handleDownloadPdf}
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          PDF
        </Button>
      </div>

      <CardContent className="space-y-6 p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SCORE_METRICS.map(({ label, key }) => {
            const value = results[key];
            return (
              <div
                key={label}
                className="rounded-xl border border-border bg-card p-3 text-center"
              >
                <p className={cn("text-3xl font-bold", assessmentScoreClassName(value))}>
                  {value.toFixed(1)}
                  <span className="text-base font-medium text-muted-foreground/60"> / 5</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 rounded-xl bg-accent/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Classification
            </Badge>
            <span className="text-base font-semibold text-primary">
              {results.classification.name}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {results.classification.description}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1 rounded-xl border border-border p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pressure Profile
            </p>
            <p className="text-base font-semibold text-foreground">{results.pressure_profile}</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm italic leading-relaxed text-foreground">
              &ldquo;{results.tradeoff_statement}&rdquo;
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold text-foreground">Your focus areas</p>
          </div>
          <ul className="space-y-2">
            {results.classification.focusAreas.map((area) => (
              <li key={area} className="flex items-start gap-2.5 text-sm text-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
