import { Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardGreetingCard from "@/components/dashboard/DashboardGreetingCard";
import DashboardMain from "@/components/dashboard/DashboardMain";
import DashboardMicroCommitments from "@/components/dashboard/DashboardMicroCommitments";
import DashboardCheckinCard from "@/components/dashboard/DashboardCheckinCard";
import DashboardInsightsCard from "@/components/dashboard/DashboardInsightsCard";
import DashboardProgressWidget from "@/components/dashboard/DashboardProgressWidget";
import BookCoachCard from "@/components/coach/BookCoachCard";
import DashboardCurrentPathCard from "@/components/dashboard/DashboardCurrentPathCard";
import DashboardModulePreviewCard from "@/components/dashboard/DashboardModulePreviewCard";
import DashboardNextDeepDiveCard from "@/components/dashboard/DashboardNextDeepDiveCard";
import DashboardChatPreviewCard from "@/components/dashboard/DashboardChatPreviewCard";
import DashboardJournalPreviewCard from "@/components/dashboard/DashboardJournalPreviewCard";
import DashboardAssessmentResultsCard from "@/components/dashboard/DashboardAssessmentResultsCard";
import DashboardReassessmentProgressCard from "@/components/dashboard/DashboardReassessmentProgressCard";
import DashboardReassessmentButton from "@/components/dashboard/DashboardReassessmentButton";
import DashboardKotaMessagesCard from "@/components/dashboard/DashboardKotaMessagesCard";
import ContinueOnboardingBanner from "@/components/dashboard/ContinueOnboardingBanner";
import SubscriptionUpgradeBannerGate from "@/components/subscription/SubscriptionUpgradeBannerGate";
import ReassessmentPdfDownloadCard from "@/components/dashboard/ReassessmentPdfDownloadCard";
import WebPushRegistrationEffect from "@/components/notifications/WebPushRegistrationEffect";
import WebPushEnableBannerGate from "@/components/notifications/WebPushEnableBannerGate";
import { useUserProfile } from "@/lib/userProfile";
import { useHrWorkplaces } from "@/hooks/useHrWorkplaces";
import { isOnboardingComplete } from "@/lib/userProfile/onboardingStatus";
import { EMPLOYER_PORTAL_ROUTE } from "@/lib/employer/routes";

function DashboardGreetingRow() {
  return (
    <div className="flex w-full flex-col gap-4">
      <DashboardGreetingCard />
      <WebPushEnableBannerGate />
      <DashboardKotaMessagesCard />
      <DashboardMicroCommitments />
    </div>
  );
}


const Dashboard = () => {
  const { profile } = useUserProfile();
  const { isPortalOnlyHr, loading: hrLoading } = useHrWorkplaces();
  const showContinueBanner = !isOnboardingComplete(profile, { isPortalOnlyHr });

  if (!hrLoading && isPortalOnlyHr) {
    return <Navigate to={EMPLOYER_PORTAL_ROUTE} replace />;
  }

  const beforeGrid = showContinueBanner ? (
    <ContinueOnboardingBanner />
  ) : (
    <div className="flex w-full flex-col gap-8">
      <SubscriptionUpgradeBannerGate />
      <DashboardReassessmentButton />
      <ReassessmentPdfDownloadCard />
      <DashboardReassessmentProgressCard />
      <DashboardAssessmentResultsCard />
      <DashboardProgressWidget />
    </div>
  );

  return (
    <>
      <DashboardLayout>
        <DashboardMain
          slots={{
            greetingRow: <DashboardGreetingRow />,
            beforeGrid,
            currentPath: <DashboardCurrentPathCard />,
            dailyCheckIn: (
              <>
                <BookCoachCard />
                <DashboardCheckinCard />
              </>
            ),
            modulePreview: !showContinueBanner ? <DashboardModulePreviewCard /> : undefined,
            nextDeepDive: !showContinueBanner ? <DashboardNextDeepDiveCard /> : undefined,
            chatPreview: <DashboardChatPreviewCard />,
            journalPreview: <DashboardJournalPreviewCard />,
            coachingInsights: <DashboardInsightsCard />,
          }}
        />
      </DashboardLayout>
      <WebPushRegistrationEffect />
    </>
  );
};

export default Dashboard;
