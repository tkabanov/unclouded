import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminOverviewTab from "@/components/settings/admin/AdminOverviewTab";
import AdminUsersTab from "@/components/settings/admin/AdminUsersTab";
import AdminPathsTab from "@/components/settings/admin/AdminPathsTab";
import AdminResourcesTab from "@/components/settings/admin/AdminResourcesTab";
import AdminInsightsTab from "@/components/settings/admin/AdminInsightsTab";
import AdminPlansTab from "@/components/settings/admin/AdminPlansTab";
import AdminWorkplacesTab from "@/components/settings/admin/AdminWorkplacesTab";
import AdminOrganizationDetail from "@/components/settings/admin/AdminOrganizationDetail";
import AdminOrganizationUsageReport from "@/components/settings/admin/AdminOrganizationUsageReport";
import AdminAnalyticsTab from "@/components/settings/admin/AdminAnalyticsTab";
import AdminOutreachTab from "@/components/settings/admin/AdminOutreachTab";
import AdminSpecialistsTab from "@/components/settings/admin/AdminSpecialistsTab";
import AdminSchedulingTab from "@/components/settings/admin/AdminSchedulingTab";
import AdminBookingsTab from "@/components/settings/admin/AdminBookingsTab";
import AdminReassessmentsTab from "@/components/settings/admin/AdminReassessmentsTab";
import AdminPromptTestSuite from "@/components/settings/admin/AdminPromptTestSuite";
import AdminReferralPartnersTab from "@/components/settings/admin/AdminReferralPartnersTab";
import AdminReferralPartnerDetail from "@/components/settings/admin/AdminReferralPartnerDetail";
import AdminReferralDashboard from "@/components/settings/admin/AdminReferralDashboard";

function AdminSection({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl p-6 md:p-8">{children}</div>;
}

export default function AdminConsole() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminOverviewTab />} />
        <Route
          path="users"
          element={
            <AdminSection>
              <AdminUsersTab />
            </AdminSection>
          }
        />
        <Route
          path="users/:userId"
          element={
            <AdminSection>
              <AdminUsersTab />
            </AdminSection>
          }
        />
        <Route
          path="paths"
          element={
            <AdminSection>
              <AdminPathsTab />
            </AdminSection>
          }
        />
        <Route
          path="organizations"
          element={
            <AdminSection>
              <AdminWorkplacesTab />
            </AdminSection>
          }
        />
        <Route
          path="organizations/usage"
          element={
            <AdminSection>
              <AdminOrganizationUsageReport />
            </AdminSection>
          }
        />
        <Route
          path="organizations/:organizationId"
          element={
            <AdminSection>
              <AdminOrganizationDetail />
            </AdminSection>
          }
        />
        <Route path="workplaces" element={<Navigate to="/admin/organizations" replace />} />
        <Route
          path="analytics"
          element={
            <AdminSection>
              <AdminAnalyticsTab />
            </AdminSection>
          }
        />
        <Route
          path="resources"
          element={
            <AdminSection>
              <AdminResourcesTab />
            </AdminSection>
          }
        />
        <Route
          path="insights"
          element={
            <AdminSection>
              <AdminInsightsTab />
            </AdminSection>
          }
        />
        <Route
          path="plans"
          element={
            <AdminSection>
              <AdminPlansTab />
            </AdminSection>
          }
        />
        <Route
          path="outreach"
          element={
            <AdminSection>
              <AdminOutreachTab />
            </AdminSection>
          }
        />
        <Route
          path="specialists"
          element={
            <AdminSection>
              <AdminSpecialistsTab />
            </AdminSection>
          }
        />
        <Route
          path="scheduling"
          element={
            <AdminSection>
              <AdminSchedulingTab />
            </AdminSection>
          }
        />
        <Route
          path="bookings"
          element={
            <AdminSection>
              <AdminBookingsTab />
            </AdminSection>
          }
        />
        <Route path="coach-bookings" element={<Navigate to="/admin/bookings" replace />} />
        <Route path="group-sessions" element={<Navigate to="/admin/bookings" replace />} />
        <Route
          path="reassessments"
          element={
            <AdminSection>
              <AdminReassessmentsTab />
            </AdminSection>
          }
        />
        <Route
          path="prompt-tests"
          element={
            <AdminSection>
              <AdminPromptTestSuite />
            </AdminSection>
          }
        />
        <Route
          path="referral-partners"
          element={
            <AdminSection>
              <AdminReferralPartnersTab />
            </AdminSection>
          }
        />
        <Route
          path="referral-partners/dashboard"
          element={
            <AdminSection>
              <AdminReferralDashboard />
            </AdminSection>
          }
        />
        <Route
          path="referral-partners/:partnerId"
          element={
            <AdminSection>
              <AdminReferralPartnerDetail />
            </AdminSection>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}
