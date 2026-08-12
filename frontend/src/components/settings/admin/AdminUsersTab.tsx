import { useNavigate, useParams } from "react-router-dom";
import AdminUserDetailPanel from "@/components/settings/admin/AdminUserDetail";
import AdminUsersTable from "@/components/settings/admin/AdminUsersTable";

export default function AdminUsersTab() {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId?: string }>();

  if (routeUserId) {
    return (
      <AdminUserDetailPanel
        userId={routeUserId}
        onBack={() => navigate("/admin/users")}
        onStatusChanged={() => undefined}
      />
    );
  }

  return (
    <AdminUsersTable onUserNavigate={(userId) => navigate(`/admin/users/${userId}`)} />
  );
}
