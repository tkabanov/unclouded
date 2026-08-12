import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminOverviewTab from "@/components/settings/admin/AdminOverviewTab";
import AdminUsersTab from "@/components/settings/admin/AdminUsersTab";
import AdminPathsTab from "@/components/settings/admin/AdminPathsTab";
import AdminResourcesTab from "@/components/settings/admin/AdminResourcesTab";
import AdminInsightsTab from "@/components/settings/admin/AdminInsightsTab";
import AdminPlansTab from "@/components/settings/admin/AdminPlansTab";
import AdminWorkplacesTab from "@/components/settings/admin/AdminWorkplacesTab";
import AdminAnalyticsTab from "@/components/settings/admin/AdminAnalyticsTab";
import AdminOutreachTab from "@/components/settings/admin/AdminOutreachTab";
import AdminCoachBookingsTab from "@/components/settings/admin/AdminCoachBookingsTab";
import AdminReassessmentsTab from "@/components/settings/admin/AdminReassessmentsTab";
import AdminPromptTestSuite from "@/components/settings/admin/AdminPromptTestSuite";

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
          path="coach-bookings"
          element={
            <AdminSection>
              <AdminCoachBookingsTab />
            </AdminSection>
          }
        />
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
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}
