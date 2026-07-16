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
import ReassessmentDueBanner from "@/components/dashboard/ReassessmentDueBanner";
import ReassessmentPdfDownloadCard from "@/components/dashboard/ReassessmentPdfDownloadCard";
import ServicesFloatingPanel from "@/components/dashboard/ServicesFloatingPanel";
import { useUserProfile } from "@/lib/userProfile";
import { isOnboardingComplete } from "@/lib/userProfile/onboardingStatus";
import {
  canShowPremiumOnDemandLocked,
  canShowReassessNow,
  daysUntilPremiumOnDemand,
  isReassessmentDue,
} from "@/lib/reassessment/reassessmentEntitlements";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";

function DashboardGreetingRow() {
  return (
    <div className="flex w-full flex-col gap-4">
      <DashboardGreetingCard />
      <DashboardQuickActions />
      <DashboardMicroCommitments />
    </div>
  );
}


const Dashboard = () => {
  const { profile } = useUserProfile();
  const showContinueBanner = !isOnboardingComplete(profile);
  const tier = resolveCurrentTier(!!profile?.subscribed, profile?.tier);
  const dateCtx = {
    tier,
    lastAssessmentDate: profile?.lastAssessmentDate ?? null,
    nextReassessmentDate: profile?.nextReassessmentDate ?? null,
    onboardingCompletedAt: profile?.onboardingCompletedAt ?? null,
    canReassessOnDemand: profile?.canReassessOnDemand,
    reassessmentCompletedAt: profile?.reassessmentCompletedAt ?? null,
  };
  const reassessmentDue = !showContinueBanner && isReassessmentDue(dateCtx);
  const showReassessNow =
    !showContinueBanner && !reassessmentDue && canShowReassessNow(dateCtx);
  const showPremiumOnDemandLocked =
    !showContinueBanner && !reassessmentDue && !showReassessNow && canShowPremiumOnDemandLocked(dateCtx);
  const daysUntilOnDemand = daysUntilPremiumOnDemand(dateCtx);

  const reassessmentBanner = showContinueBanner ? (
    <ContinueOnboardingBanner />
  ) : reassessmentDue ? (
    <ReassessmentDueBanner variant="due" />
  ) : showReassessNow ? (
    <ReassessmentDueBanner variant="on_demand" />
  ) : showPremiumOnDemandLocked ? (
    <ReassessmentDueBanner variant="on_demand_locked" daysUntilOnDemand={daysUntilOnDemand} />
  ) : null;

  const beforeGrid =
    showContinueBanner ? (
      reassessmentBanner
    ) : (
      <div className="flex w-full flex-col gap-4">
        {reassessmentBanner}
        <ReassessmentPdfDownloadCard />
      </div>
    );

  return (
    <>
      <DashboardLayout>
        <DashboardMain
          slots={{
            greetingRow: <DashboardGreetingRow />,
            beforeGrid,
            dailyCheckIn: (
              <>
                <DashboardCheckinCard />
                <DashboardInsightsCard />
              </>
            ),
            currentPath: <DashboardCurrentPathCard />,
            chatPreview: <DashboardChatPreviewCard />,
            journalPreview: <DashboardJournalPreviewCard />,
            crisisSupport: <CrisisSupportCard />,
          }}
        />
      </DashboardLayout>
      <ServicesFloatingPanel />
    </>
  );
};

export default Dashboard;
