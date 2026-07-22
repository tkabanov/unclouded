import { CalendarDays, CircleCheck, Download, Heart, Sparkles } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import dashboardHero from "@/assets/dashboard-hero.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardUserContext } from "@/hooks/useDashboardUser";
import { downloadOnboardingResultsPdf } from "@/lib/dashboard/downloadOnboardingResultsPdf";
import { DASHBOARD_DAILY_CHECKIN_ID } from "@/lib/dashboard/routes";
import { cn } from "@/lib/utils";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

const heroButtonClass =
  "gap-1.5 bg-card/70 backdrop-blur-sm hover:bg-card/90";

export default function DashboardGreetingCard() {
  const navigate = useNavigate();
  const {
    firstName,
    classificationName,
    pressureProfile,
    recoveryModeActive,
    griefModeActive,
    hasResults,
    profile,
  } = useDashboardUserContext();

  const greetingName = firstName.trim() ? `${getGreeting()}, ${firstName.trim()}` : getGreeting();
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

  const scrollToCheckIn = useCallback(() => {
    document.getElementById(DASHBOARD_DAILY_CHECKIN_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  if (!hasResults || !results) {
    return (
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
          {greetingName}
        </h1>
        <p className="text-muted-foreground">Your dashboard is ready to be personalized.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border shadow-card">
      <img
        src={dashboardHero}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/85 to-card/40" />

      <div className="relative space-y-5 p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              {greetingName}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              {classificationName ? (
                <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-medium">
                  {classificationName}
                </Badge>
              ) : null}

              {pressureProfile ? (
                <Badge
                  variant="outline"
                  className="border-border/80 bg-card/60 px-2.5 py-0.5 text-xs font-medium"
                >
                  {pressureProfile}
                </Badge>
              ) : null}

              {recoveryModeActive ? (
                <Badge className="gap-1 bg-emerald-600 px-2.5 py-0.5 text-xs text-primary-foreground hover:bg-emerald-600">
                  <Heart className="h-3 w-3" aria-hidden />
                  Recovery
                </Badge>
              ) : null}

              {griefModeActive ? (
                <Badge className="gap-1 bg-sky-500 px-2.5 py-0.5 text-xs text-primary-foreground hover:bg-sky-500">
                  <Heart className="h-3 w-3" aria-hidden />
                  Grief-Informed
                </Badge>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              AI coaching · not therapy or medical advice
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(heroButtonClass, "shrink-0")}
            onClick={handleDownloadPdf}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download results (PDF)
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={heroButtonClass}
            onClick={() => navigate("/paths")}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Plan tomorrow
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={heroButtonClass}
            onClick={() => navigate("/journal")}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Reflect on today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={heroButtonClass}
            onClick={scrollToCheckIn}
          >
            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
            Check in now
          </Button>
        </div>
      </div>
    </div>
  );
}
