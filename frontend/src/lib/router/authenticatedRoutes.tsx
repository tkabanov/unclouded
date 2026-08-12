import type { RouteObject } from "react-router-dom";
import ModuleWizard from "@/pages/ModuleWizard";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Journal from "@/pages/Journal";
import Paths from "@/pages/Paths";
import Settings from "@/pages/Settings";
import Subscription from "@/pages/Subscription";
import SettingsSubscriptionRedirect from "@/pages/SettingsSubscriptionRedirect";
import EmployerPortal from "@/pages/EmployerPortal";
import VoiceSession from "@/pages/VoiceSession";
import AdminConsole from "@/pages/AdminConsole";

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
  { path: "/coaching/voice", element: <VoiceSession /> },
  { path: "/journal", element: <Journal /> },
  { path: "/subscription", element: <Subscription /> },
  { path: "/settings", element: <Settings /> },
  { path: "/settings/subscription", element: <SettingsSubscriptionRedirect /> },
  { path: "/settings/know-yourself/:moduleSlug", element: <ModuleWizard /> },
  { path: "/paths", element: <Paths /> },
  { path: "/employer", element: <EmployerPortal /> },
  { path: "/admin/*", element: <AdminConsole /> },
];

export function toAuthenticatedRouteObjects(): RouteObject[] {
  return authenticatedRouteDefs.map((route) => ({
    path: route.path,
    element: route.element,
    handle: { requiresAuth: true } satisfies AppRouteMeta,
  }));
}
