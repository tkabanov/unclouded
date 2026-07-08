import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Lightbulb,
  Sparkles,
  TrendingUp,
  CalendarDays,
  Clock,
  CheckCircle2,
  Download,
  Target,
  Gauge,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getDashboardConfig } from "@/lib/classification";
import { generateResultsPdf, generateComparisonPdf } from "@/lib/resultsPdf";
import { useUserProfile } from "@/lib/userProfile";
import { isReassessmentDue, daysUntilReassessment } from "@/lib/reassessment";
import ResultsComparison from "@/components/ResultsComparison";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardGreetingCard from "@/components/dashboard/DashboardGreetingCard";
import DashboardMain from "@/components/dashboard/DashboardMain";
import DashboardMicroCommitments from "@/components/dashboard/DashboardMicroCommitments";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import DashboardCheckinCard from "@/components/dashboard/DashboardCheckinCard";
import DashboardInsightsCard from "@/components/dashboard/DashboardInsightsCard";
import DashboardCurrentPathCard from "@/components/dashboard/DashboardCurrentPathCard";
import DashboardChatPreviewCard from "@/components/dashboard/DashboardChatPreviewCard";
import DashboardJournalPreviewCard from "@/components/dashboard/DashboardJournalPreviewCard";
import { CrisisSupportCard } from "@/components/crisis";
import ContinueOnboardingBanner from "@/components/dashboard/ContinueOnboardingBanner";
import ServicesFloatingPanel from "@/components/dashboard/ServicesFloatingPanel";
import {
  DASHBOARD_HEADER_INSTANCE_BUBBLE_ID,
  DASHBOARD_PAGE_BUBBLE_ID,
  DASHBOARD_SIDEBAR_INSTANCE_BUBBLE_ID,
} from "@/lib/dashboard/routes";
import { toast } from "sonner";
function DashboardGreetingRow() {
  return (
    <div className="flex w-full flex-col gap-4">
      <DashboardGreetingCard />
      <DashboardQuickActions />
      <DashboardMicroCommitments />
    </div>
  );
}

/* ── main dashboard ───────────────────────────────────── */

const dashboardShellProps = {
  pageBubbleId: DASHBOARD_PAGE_BUBBLE_ID,
  headerBubbleId: DASHBOARD_HEADER_INSTANCE_BUBBLE_ID,
  sidebarBubbleId: DASHBOARD_SIDEBAR_INSTANCE_BUBBLE_ID,
} as const;

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useUserProfile();

  const config = useMemo(
    () =>
      profile?.results
        ? getDashboardConfig(profile.results.classification, {
            recovery_mode_active: profile.results.recovery_mode_active,
            grief_mode_active: profile.results.grief_mode_active,
            trauma_informed_mode: profile.results.trauma_informed_mode,
          })
        : null,
    [profile],
  );

  if (!profile || !profile.results || !config) {
    return (
      <>
        <DashboardLayout {...dashboardShellProps}>
          <DashboardMain
            slots={{
              greetingRow: <DashboardGreetingRow />,
              beforeGrid: <ContinueOnboardingBanner />,
              crisisSupport: <CrisisSupportCard />,
              dailyCheckIn: (
              <div className="pointer-events-none grid select-none grid-cols-1 gap-4 opacity-60 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Gauge className="h-4 w-4 text-primary" /> Your Assessment Results
                    </CardTitle>
                    <CardDescription>Personalized scores appear here after onboarding</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {["Stability", "Performance", "Alignment", "Orientation"].map((l) => (
                        <div key={l} className="space-y-2 rounded-lg border p-3">
                          <div className="h-2 w-16 rounded bg-muted" />
                          <div className="h-6 w-10 rounded bg-muted" />
                        </div>
                      ))}
                    </div>
                    <div className="h-2 w-full rounded bg-muted" />
                    <div className="h-2 w-3/4 rounded bg-muted" />
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Heart className="h-4 w-4 text-primary" /> Daily Check-In
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="h-2 w-full rounded bg-muted" />
                      <div className="h-2 w-2/3 rounded bg-muted" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Lightbulb className="h-4 w-4 text-primary" /> Coaching Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="h-2 w-full rounded bg-muted" />
                      <div className="h-2 w-1/2 rounded bg-muted" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ),
          }}
        />
        </DashboardLayout>
        <ServicesFloatingPanel />
      </>
    );
  }

  const { firstName } = profile;
  const results = profile.results;

  const handleDownloadPdf = () => {
    try {
      generateResultsPdf(firstName, results);
      toast.success("Your results PDF is downloading.");
    } catch (err) {
      console.error("Failed to generate PDF", err);
      toast.error("Couldn't generate the PDF. Please try again.");
    }
  };

  const scoreTone = (s: number) =>
    s < 3.2 ? "text-destructive" : s < 3.8 ? "text-amber-500" : "text-emerald-600";

  const reassessment = profile.reassessmentResults;
  const reassessmentDue = profile.subscribed && isReassessmentDue(profile.onboardingCompletedAt);
  const daysLeft = daysUntilReassessment(profile.onboardingCompletedAt);

  const handleDownloadComparison = () => {
    if (!reassessment) return;
    try {
      generateComparisonPdf(firstName, results, reassessment, profile.reassessmentReflections);
      toast.success("Your progress report is downloading.");
    } catch (err) {
      console.error("Failed to generate comparison PDF", err);
      toast.error("Couldn't generate the report. Please try again.");
    }
  };

  return (
    <>
      <DashboardLayout {...dashboardShellProps}>
        <DashboardMain
          slots={{
            greetingRow: <DashboardGreetingRow />,
            beforeGrid: (
            <>
              {!profile.subscribed && (
                <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-5 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-start gap-3">
                    <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">Unlock the full coaching experience</p>
                      <p className="text-sm text-muted-foreground">
                        Go Pro for unlimited coaching and your 90-day reassessment — or Premium for 1:1
                        human coaching.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="cta"
                    className="shrink-0 gap-1.5"
                    onClick={() => navigate("/subscription")}
                  >
                    <Crown className="h-4 w-4" /> View plans
                  </Button>
                </div>
              )}

              {reassessmentDue && !reassessment && (
                <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-start gap-3">
                    <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">Your 90-day reassessment is ready</p>
                      <p className="text-sm text-muted-foreground">
                        Retake the assessment to see how your scores have changed since day one.
                      </p>
                    </div>
                  </div>
                  <Button variant="cta" className="shrink-0" onClick={() => navigate("/reassessment")}>
                    Start reassessment
                  </Button>
                </div>
              )}

              {profile.subscribed && !reassessmentDue && !reassessment && daysLeft !== null && daysLeft > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Your 90-day reassessment unlocks in {daysLeft} {daysLeft === 1 ? "day" : "days"}.
                </p>
              )}

              {reassessment && (
                <div className="space-y-5 rounded-xl border border-border bg-card p-5 md:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Your progress</h2>
                      <p className="text-sm text-muted-foreground">
                        Comparing your first assessment with your 90-day reassessment
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => navigate("/reassessment")}
                      >
                        View full
                      </Button>
                      <Button variant="cta" size="sm" className="gap-1.5" onClick={handleDownloadComparison}>
                        <Download className="h-3.5 w-3.5" /> Progress PDF
                      </Button>
                    </div>
                  </div>
                  <ResultsComparison
                    firstName={firstName}
                    first={results}
                    second={reassessment}
                    reflections={profile.reassessmentReflections}
                    compact
                  />
                </div>
              )}
            </>
          ),
          dailyCheckIn: (
            <>
              <DashboardCheckinCard />

              <Card className="overflow-hidden border-primary/20">
                <div className="flex items-center justify-between gap-4 border-b border-primary/10 bg-primary/5 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Gauge className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold leading-tight text-foreground">
                        Your Assessment Results
                      </h2>
                      <p className="text-xs text-muted-foreground">Based on your onboarding responses</p>
                    </div>
                  </div>
                  <Button variant="cta" size="sm" className="shrink-0 gap-1.5" onClick={handleDownloadPdf}>
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>

                <CardContent className="space-y-6 p-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Stability", value: results.stability_score },
                      { label: "Performance", value: results.performance_score },
                      { label: "Alignment", value: results.alignment_score },
                      { label: "Orientation", value: results.orientation_score },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
                        <p className={cn("text-3xl font-bold tabular-nums", scoreTone(s.value))}>
                          {s.value.toFixed(1)}
                          <span className="text-base font-medium text-muted-foreground/60"> / 5</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 rounded-xl bg-accent/40 p-4">
                    <div className="flex items-center gap-2">
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
                      <Target className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Your focus areas</p>
                    </div>
                    <ul className="space-y-2">
                      {results.classification.focusAreas.map((area) => (
                        <li key={area} className="flex items-start gap-2.5 text-sm text-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <DashboardInsightsCard />
            </>
          ),
          chatPreview: <DashboardChatPreviewCard />,
          journalPreview: <DashboardJournalPreviewCard />,
          crisisSupport: <CrisisSupportCard />,
          currentPath: (
            <>
              <DashboardCurrentPathCard />

              <Card className="bg-muted/50">
                <CardContent className="space-y-2 p-4 text-center">
                  <Sparkles className="mx-auto h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Next deep-dive:{" "}
                    <span className="font-semibold text-foreground">{results.first_module}</span>
                    {" — "}
                    <span className="font-semibold text-foreground">
                      {results.module_days} {results.module_days === 1 ? "day" : "days"}
                    </span>
                  </p>
                  {config.modulesToSurface.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                      {config.modulesToSurface.map((m) => (
                        <Badge key={m} variant="outline" className="text-[10px]">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {config.showPremiumUpsell && (
                <Card className="border-primary/40 bg-primary/5">
                  <CardContent className="space-y-2 p-4 text-center">
                    <TrendingUp className="mx-auto h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Ready for the next level?</p>
                    <p className="text-xs text-muted-foreground">
                      Unlock premium paths for high-performers.
                    </p>
                    <Button
                      variant="cta"
                      size="sm"
                      className="text-xs"
                      onClick={() => navigate("/subscription")}
                    >
                      Explore Premium
                    </Button>
                  </CardContent>
                </Card>
              )}

              {config.showProgressDelta && (
                <div className="py-2 text-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
                  Growth delta visible after 30 days.
                </div>
              )}
            </>
          ),
        }}
      />
      </DashboardLayout>
      <ServicesFloatingPanel />
    </>
  );
};

export default Dashboard;
