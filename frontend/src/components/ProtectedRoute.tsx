import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  AUTH_REDIRECT_PATH,
  PASSWORD_RECOVERY_PATH,
  useRequireAuth,
} from "@/lib/router/requireAuth";

type ProtectedRouteProps = {
  children?: React.ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const authState = useRequireAuth();

  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <Navigate to={AUTH_REDIRECT_PATH} replace />;
  }

  if (authState === "recovery") {
    return <Navigate to={PASSWORD_RECOVERY_PATH} replace />;
  }

  if (children !== undefined) {
    return <>{children}</>;
  }

  return <Outlet />;
};

export default ProtectedRoute;
