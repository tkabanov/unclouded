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
import { useUserProfile } from "@/lib/userProfile";
import { isOnboardingComplete } from "@/lib/userProfile/onboardingStatus";

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

  return (
    <>
      <DashboardLayout>
        <DashboardMain
          slots={{
            greetingRow: <DashboardGreetingRow />,
            beforeGrid: showContinueBanner ? <ContinueOnboardingBanner /> : undefined,
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
