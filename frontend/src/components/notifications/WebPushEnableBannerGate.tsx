import { useUserProfile } from "@/lib/userProfile";
import { resolveHealthModeFlags } from "@/lib/userProfile/healthModeFlags";
import WebPushEnableBanner from "@/components/notifications/WebPushEnableBanner";

/** Shows the Web Push opt-in banner only for grief/recovery cohort (REQ-07). */
export default function WebPushEnableBannerGate() {
  const { profile, loading } = useUserProfile();

  if (loading || !profile || !profile.onboardingCompleted) {
    return null;
  }

  const { griefModeActive, recoveryModeActive } = resolveHealthModeFlags(profile);
  if (!griefModeActive && !recoveryModeActive) {
    return null;
  }

  return <WebPushEnableBanner />;
}
