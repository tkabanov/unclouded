import type { RouteObject } from "react-router-dom";
import ModuleWizard from "@/pages/ModuleWizard";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Journal from "@/pages/Journal";
import Paths from "@/pages/Paths";
import Settings from "@/pages/Settings";
import EmployerPortal from "@/pages/EmployerPortal";

export type AppRouteMeta = {
  requiresAuth: true;
};

export type AuthenticatedRouteDef = {
  path: string;
  element: React.ReactNode;
};

/** Authenticated SPA routes — each entry carries `requiresAuth` router meta. */
export const authenticatedRouteDefs: AuthenticatedRouteDef[] = [
  { path: "/onboarding", element: <Onboarding /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/chat", element: <Chat /> },
  { path: "/journal", element: <Journal /> },
  { path: "/settings", element: <Settings /> },
  { path: "/settings/know-yourself/:moduleSlug", element: <ModuleWizard /> },
  { path: "/paths", element: <Paths /> },
  { path: "/employer", element: <EmployerPortal /> },
];

export function toAuthenticatedRouteObjects(): RouteObject[] {
  return authenticatedRouteDefs.map((route) => ({
    path: route.path,
    element: route.element,
    handle: { requiresAuth: true } satisfies AppRouteMeta,
  }));
}
