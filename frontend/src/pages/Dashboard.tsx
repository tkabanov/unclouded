import DashboardLayout from "@/components/DashboardLayout";
import DashboardGreetingCard from "@/components/dashboard/DashboardGreetingCard";
import DashboardMain from "@/components/dashboard/DashboardMain";
import DashboardMicroCommitments from "@/components/dashboard/DashboardMicroCommitments";
import DashboardCheckinCard from "@/components/dashboard/DashboardCheckinCard";
import DashboardProgressWidget from "@/components/dashboard/DashboardProgressWidget";
import QuickCheckinCard from "@/components/dashboard/QuickCheckinCard";
import BookCoachCard from "@/components/coach/BookCoachCard";
import DashboardInsightsCard from "@/components/dashboard/DashboardInsightsCard";
import DashboardCurrentPathCard from "@/components/dashboard/DashboardCurrentPathCard";
import DashboardModulePreviewCard from "@/components/dashboard/DashboardModulePreviewCard";
import DashboardChatPreviewCard from "@/components/dashboard/DashboardChatPreviewCard";
import DashboardJournalPreviewCard from "@/components/dashboard/DashboardJournalPreviewCard";
import DashboardAssessmentResultsCard from "@/components/dashboard/DashboardAssessmentResultsCard";
import DashboardReassessmentProgressCard from "@/components/dashboard/DashboardReassessmentProgressCard";
import DashboardReassessmentButton from "@/components/dashboard/DashboardReassessmentButton";
import ContinueOnboardingBanner from "@/components/dashboard/ContinueOnboardingBanner";
import ReassessmentPdfDownloadCard from "@/components/dashboard/ReassessmentPdfDownloadCard";
import ServicesFloatingPanel from "@/components/dashboard/ServicesFloatingPanel";
import WebPushRegistrationEffect from "@/components/notifications/WebPushRegistrationEffect";
import WebPushEnableBannerGate from "@/components/notifications/WebPushEnableBannerGate";
import { useUserProfile } from "@/lib/userProfile";
import { isOnboardingComplete } from "@/lib/userProfile/onboardingStatus";

function DashboardGreetingRow() {
  return (
    <div className="flex w-full flex-col gap-4">
      <DashboardGreetingCard />
      <WebPushEnableBannerGate />
      <DashboardMicroCommitments />
    </div>
  );
}


const Dashboard = () => {
  const { profile } = useUserProfile();
  const showContinueBanner = !isOnboardingComplete(profile);

  const beforeGrid = showContinueBanner ? (
    <ContinueOnboardingBanner />
  ) : (
    <div className="flex w-full flex-col gap-4">
      <DashboardReassessmentButton />
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
            reassessmentProgress: !showContinueBanner ? (
              <DashboardReassessmentProgressCard />
            ) : undefined,
            assessmentResults: !showContinueBanner ? <DashboardAssessmentResultsCard /> : undefined,
            dailyCheckIn: (
              <>
                <DashboardProgressWidget />
                <QuickCheckinCard />
                <BookCoachCard />
                <DashboardCheckinCard />
                <DashboardInsightsCard />
              </>
            ),
            modulePreview: !showContinueBanner ? <DashboardModulePreviewCard /> : undefined,
            currentPath: <DashboardCurrentPathCard />,
            chatPreview: <DashboardChatPreviewCard />,
            journalPreview: <DashboardJournalPreviewCard />,
          }}
        />
      </DashboardLayout>
      <WebPushRegistrationEffect />
      <ServicesFloatingPanel />
    </>
  );
};

export default Dashboard;
